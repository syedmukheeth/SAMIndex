const axios = require('axios');
const User = require('../models/User');
const Repository = require('../models/repository.model');
const AppError = require('../utils/appError');
const ranking = require('../utils/ranking');
const cache = require('../utils/cache');

class GitHubService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN.trim()}` : '',
      },
    });

    // Add logging for debugging rate limits
    this.client.interceptors.request.use(config => {
      const auth = config.headers.Authorization;
      console.log(`[GitHub API] ${config.method.toUpperCase()} ${config.url}`);
      console.log(`[GitHub API] Auth Header: ${auth ? auth.substring(0, 15) + '...' : 'NONE'}`);
      if (!auth) {
        console.warn('[GitHub API] Warning: No Authorization token found in headers!');
      }
      return config;
    });

    this.client.interceptors.response.use(
      response => {
        const remaining = response.headers['x-ratelimit-remaining'];
        const limit = response.headers['x-ratelimit-limit'];
        if (remaining) {
          console.log(`[GitHub API] Rate Limit: ${remaining}/${limit}`);
        }
        return response;
      },
      error => {
        if (error.response) {
          console.error('[GitHub API] Full Error Detail:', {
            status: error.response.status,
            data: error.response.data,
            headers: {
              'x-ratelimit-limit': error.response.headers['x-ratelimit-limit'],
              'x-ratelimit-remaining': error.response.headers['x-ratelimit-remaining'],
              'x-ratelimit-reset': error.response.headers['x-ratelimit-reset'],
              'retry-after': error.response.headers['retry-after'],
            }
          });
        }
        return Promise.reject(error);
      }
    );
  }

  async fetchUserData(username) {
    try {
      const response = await this.client.get(`/users/${username}`);
      const { data } = response;

      return {
        username: data.login,
        avatar: data.avatar_url,
        bio: data.bio,
        followers: data.followers,
        following: data.following,
        publicRepos: data.public_repos,
        githubId: data.id,
      };
    } catch (error) {
      this._handleGitHubError(error, `User ${username} not found`);
    }
  }

  async fetchUserRepos(username) {
    try {
      const response = await this.client.get(`/users/${username}/repos?per_page=100&sort=updated`);
      return response.data.map((repo) => ({
        name: repo.name,
        owner: repo.owner.login,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        lang: repo.language,
        url: repo.html_url,
        description: repo.description,
        githubId: repo.id,
      }));
    } catch (error) {
      this._handleGitHubError(error, `Could not fetch repositories for ${username}`);
    }
  }

  async syncUserData(username) {
    const userData = await this.fetchUserData(username);
    const reposData = await this.fetchUserRepos(username);

    // Calculate total stars across all fetched repos
    const totalStars = reposData.reduce((acc, repo) => acc + repo.stars, 0);
    
    // Use ranking utility to calculate score
    userData.score = ranking.calculateUserScore(userData.followers, totalStars);

    // 1. Sync User (Update if exists, otherwise create)
    const user = await User.findOneAndUpdate(
      { githubId: userData.githubId },
      userData,
      { upsert: true, new: true, runValidators: true }
    );

    // 2. Sync Repositories
    const repoOperations = reposData.map((repo) => ({
      updateOne: {
        filter: { githubId: repo.githubId },
        update: repo,
        upsert: true,
      },
    }));

    if (repoOperations.length > 0) {
      await Repository.bulkWrite(repoOperations);
    }

    // Invalidate Cache for this user
    cache.del(`user:${username}`);
    // Optional: Clear general search cache if you want ultra-fresh results
    // cache.flushAll(); 

    return { user, reposCount: reposData.length };
  }

  /**
   * Fetch all file paths in a repository recursively, handling GitHub's 100k limit
   * @param {string} owner 
   * @param {string} repo 
   */
  async getRepoFiles(owner, repo) {
    try {
      // 1. Get default branch first
      const repoInfo = await this.client.get(`/repos/${owner}/${repo}`);
      const defaultBranch = repoInfo.data.default_branch;

      // 2. Fetch all tree items (with fallback for truncation)
      const allItems = await this._fetchTreeRecursive(owner, repo, defaultBranch);

      const allowedExtensions = ['.js', '.ts', '.cpp', '.c', '.py', '.java', '.json'];

      // 3. Filter only code files and include metadata
      const files = allItems
        .filter((item) => {
          if (item.type !== 'blob') return false;
          const ext = item.path.slice((Math.max(0, item.path.lastIndexOf(".")) || Infinity) + 1);
          return allowedExtensions.includes(`.${ext}`);
        })
        .map((item) => ({
          path: item.path,
          size: item.size
        }));

      return files;
    } catch (error) {
      this._handleGitHubError(error, `Could not traverse repository ${owner}/${repo}`);
    }
  }

  /**
   * Internal recursive helper to handle large repository trees
   */
  async _fetchTreeRecursive(owner, repo, sha, pathPrefix = '') {
    try {
      // Attempt recursive fetch first (most efficient)
      const response = await this.client.get(
        `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
      );
      
      let { tree, truncated } = response.data;

      // If not truncated, we have everything in one call!
      if (!truncated) {
        return tree.map(item => ({
          ...item,
          path: pathPrefix + item.path
        }));
      }

      // If truncated, it means this tree has > 100,000 entries (or GitHub's internal limit hit)
      // We must fetch this level non-recursively and then dive into subtrees
      console.warn(`[GitHub API] Tree truncated at ${pathPrefix || 'root'}. Falling back to manual recursion.`);
      
      const nonRecursiveResponse = await this.client.get(
        `/repos/${owner}/${repo}/git/trees/${sha}`
      );
      
      const items = nonRecursiveResponse.data.tree;
      let allItems = [];

      for (const item of items) {
        const fullPath = pathPrefix + item.path;
        
        if (item.type === 'blob') {
          allItems.push({ ...item, path: fullPath });
        } else if (item.type === 'tree') {
          // Recurse into this subdirectory
          const subItems = await this._fetchTreeRecursive(owner, repo, item.sha, fullPath + '/');
          allItems = allItems.concat(subItems);
        }
      }

      return allItems;
    } catch (error) {
      // Log error but allow other branches to continue if possible
      console.error(`[GitHub API] Failed to fetch tree ${sha} at ${pathPrefix}:`, error.message);
      return [];
    }
  }

  /**
   * Fetch and decode content of a specific file
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} path 
   */
  async getFileContent(owner, repo, path) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`);
      const { data } = response;

      // 1. Handle non-file or empty content
      if (Array.isArray(data) || !data.content) {
        return '';
      }

      // 2. Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return content;
    } catch (error) {
      // If file is too large (>1MB), the contents API might return 403 or specific message
      // We skip these for now as per requirements
      if (error.response?.status === 403 || error.response?.status === 413) {
        console.warn(`Skipping large file: ${path}`);
        return null;
      }
      this._handleGitHubError(error, `File ${path} not found in ${owner}/${repo}`);
    }
  }

  _handleGitHubError(error, defaultMessage) {
    if (error.response) {
      if (error.response.status === 404) {
        throw new AppError(defaultMessage, 404);
      }
      if (error.response.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
        throw new AppError('GitHub API rate limit exceeded. Please try again later.', 429);
      }
      throw new AppError(error.response.data.message || 'GitHub API error', error.response.status);
    }
    throw new AppError(error.message || 'Internal Server Error', 500);
  }
}

module.exports = new GitHubService();
