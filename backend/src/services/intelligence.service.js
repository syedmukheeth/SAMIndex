const { GoogleGenerativeAI } = require("@google/generative-ai");
const redis = require('../config/redis');

/**
 * Principal AI Intelligence Engine
 * Transforms raw file streams into living architecture intelligence.
 */
class IntelligenceService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    
    // Architectural Signatures (The "Sniffer")
    this.signatures = [
      { id: 'infra', category: 'Infrastructure', patterns: [/docker/i, /kubernetes/i, /terraform/i, /helm/i, /ansible/i, /workflow/i] },
      { id: 'messaging', category: 'Queue/Realtime', patterns: [/kafka/i, /rabbitmq/i, /redis/i, /bullmq/i, /socket\.io/i, /mqtt/i] },
      { id: 'security', category: 'Security', patterns: [/jwt/i, /oauth/i, /auth/i, /cors/i, /helmet/i, /crypto/i, /bcrypt/i] },
      { id: 'observability', category: 'Observability', patterns: [/prometheus/i, /grafana/i, /sentry/i, /winston/i, /pino/i, /datadog/i] },
      { id: 'database', category: 'Storage', patterns: [/mongoose/i, /sequelize/i, /knex/i, /prisma/i, /postgresql/i, /mongodb/i, /dynamodb/i] },
      { id: 'api', category: 'Connectivity', patterns: [/axios/i, /express/i, /fastify/i, /grpc/i, /graphql/i, /apollo/i, /swagger/i] }
    ];
  }

  /**
   * Extract architectural signals from a single file
   * @param {string} fileName 
   * @param {string} content 
   * @returns {Array} List of detected signals
   */
  extractSignals(fileName, content) {
    const signals = [];
    const lowerContent = content.substring(0, 5000).toLowerCase(); // Only scan top of file for efficiency
    const lowerFile = fileName.toLowerCase();

    for (const sig of this.signatures) {
      const match = sig.patterns.some(p => p.test(lowerFile) || p.test(lowerContent));
      if (match) {
        signals.push({
          category: sig.category,
          file: fileName,
          timestamp: Date.now()
        });
      }
    }
    return signals;
  }

  /**
   * Accumulate signals and trigger reasoning if threshold reached
   */
  async processSignals(owner, repo, newSignals) {
    if (!newSignals || newSignals.length === 0) return;

    const repoKey = `intel:${owner.toLowerCase()}:${repo.toLowerCase()}`;
    const signalsKey = `${repoKey}:signals`;

    // 1. Store new signals in Redis
    for (const sig of newSignals) {
      await redis.client.rPush(signalsKey, JSON.stringify(sig));
    }

    // 2. Check if we should run reasoning (every 30 signals or so)
    const totalSignals = await redis.client.lLen(signalsKey);
    if (totalSignals > 0 && totalSignals % 30 === 0) {
      await this.runReasoning(owner, repo);
    }
  }

  /**
   * AI Reasoning Step: Synthesize accumulated signals into structured intelligence
   */
  async runReasoning(owner, repo) {
    if (!this.genAI) return;

    const repoKey = `intel:${owner.toLowerCase()}:${repo.toLowerCase()}`;
    const signalsKey = `${repoKey}:signals`;
    const genomeKey = `${repoKey}:genome`;

    try {
      // 1. Get accumulated signals
      const signalsRaw = await redis.client.lRange(signalsKey, 0, -1);
      const signals = signalsRaw.map(s => JSON.parse(s));

      // 2. Prepare context for AI
      const signalSummary = signals.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = new Set();
        acc[s.category].add(s.file);
        return acc;
      }, {});

      const contextString = Object.entries(signalSummary)
        .map(([cat, files]) => `${cat}: [${Array.from(files).slice(0, 10).join(', ')}]`)
        .join('\n');

      console.log(`[IntelligenceService] Running reasoning for ${owner}/${repo}...`);

      // 3. AI Reasoning Prompt
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        You are a Principal Systems Architect. Analyze the following architectural signals from a repository and generate a high-level "Repository Genome".
        
        Signals:
        ${contextString}

        Output a JSON object with the following structure:
        {
          "architecture": "A technical description of the topology (max 15 words)",
          "scalability": { "score": 0-100, "reasoning": "Staff-level analysis" },
          "security": { "score": 0-100, "reasoning": "Threat surface analysis" },
          "observability": { "score": 0-100, "reasoning": "Telemetry readiness" },
          "infra_maturity": { "score": 0-100, "reasoning": "IaC and reliability" },
          "realtime_readiness": { "score": 0-100, "reasoning": "Queue/PubSub analysis" },
          "confidence": 0.0-1.0,
          "key_files": ["list of 3 most influential files"]
        }
        
        BE CRITICAL. If signals are missing, give low scores. Use professional, senior-engineer-grade terminology.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response (handle markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const genome = JSON.parse(jsonMatch[0]);
        await redis.client.set(genomeKey, JSON.stringify(genome), { EX: 3600 }); // 1hr TTL
        console.log(`[IntelligenceService] Genome updated for ${owner}/${repo}`);
      }

    } catch (err) {
      console.error('[IntelligenceService] Reasoning failed:', err.message);
    }
  }

  /**
   * Get current intelligence state
   */
  async getIntelligence(owner, repo) {
    const repoKey = `intel:${owner.toLowerCase()}:${repo.toLowerCase()}`;
    const genomeKey = `${repoKey}:genome`;
    
    const genome = await redis.client.get(genomeKey);
    return genome ? JSON.parse(genome) : null;
  }

  /**
   * Clean up intelligence data
   */
  async cleanup(owner, repo) {
    const repoKey = `intel:${owner.toLowerCase()}:${repo.toLowerCase()}`;
    await redis.client.del(`${repoKey}:signals`);
    await redis.client.del(`${repoKey}:genome`);
  }
}

module.exports = new IntelligenceService();
