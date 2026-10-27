const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const {
  Workspace,
  User,
  Clause,
  Fact,
  Term,
  Asset,
  Draft,
  Revision,
  Finding,
  Comment,
  AuditLog,
  AiUseLog,
  ReviewCache
} = require('../models');

const {
  clauses,
  facts,
  terms,
  assets,
  demoUsers,
  sampleDrafts
} = require('./seedData');
const { computeReviewHash } = require('../services/aiReview');
const { runExactChecks } = require('../services/exactChecks');

async function seedBrewlineWorkspace({ forceReset = false } = {}) {
  console.log('[Seeder] Starting idempotent seed for Brewline Coffee Co...');

  let workspace = await Workspace.findOne({ slug: 'brewline-coffee' });
  if (!workspace) {
    workspace = await Workspace.create({
      name: 'Brewline Coffee Co.',
      slug: 'brewline-coffee',
      description: 'Artisanal direct-trade coffee roaster based in Coorg, Karnataka. Celebrating regenerative agro-forestry and fair grower compensation.',
      version: 1
    });
    console.log('[Seeder] Created Brewline Coffee Co. workspace');
  }

  const workspaceId = workspace._id;

  if (forceReset) {
    console.log('[Seeder] Force reset requested. Cleaning existing workspace data...');
    const userIds = (await User.find({ workspaceId })).map(u => u._id);
    const draftIds = (await Draft.find({ workspaceId })).map(d => d._id);

    await Promise.all([
      Clause.deleteMany({ workspaceId }),
      Fact.deleteMany({ workspaceId }),
      Term.deleteMany({ workspaceId }),
      Asset.deleteMany({ workspaceId }),
      User.deleteMany({ workspaceId }),
      Draft.deleteMany({ workspaceId }),
      Revision.deleteMany({ draftId: { $in: draftIds } }),
      Finding.deleteMany({ draftId: { $in: draftIds } }),
      Comment.deleteMany({ draftId: { $in: draftIds } }),
      AuditLog.deleteMany({ workspaceId }),
      AiUseLog.deleteMany({ workspaceId })
    ]);
    console.log('[Seeder] Cleaned existing workspace collections.');
  }

  // 1. Seed Demo Users
  const userMap = {};
  for (const u of demoUsers) {
    let user = await User.findOne({ email: u.email });
    const hashedPassword = await bcrypt.hash(u.password, 10);
    if (!user) {
      user = await User.create({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        workspaceId
      });
      console.log(`[Seeder] Created demo user: ${u.role} (${u.email})`);
    } else {
      user.role = u.role;
      user.name = u.name;
      user.password = hashedPassword;
      user.workspaceId = workspaceId;
      await user.save();
    }
    userMap[u.role] = user;
  }

  // 2. Seed Clauses (~20)
  for (const c of clauses) {
    await Clause.findOneAndUpdate(
      { workspaceId, clauseId: c.clauseId },
      { ...c, workspaceId },
      { upsert: true, new: true }
    );
  }
  console.log(`[Seeder] Seeded ${clauses.length} clauses.`);

  // 3. Seed Facts (~8)
  for (const f of facts) {
    await Fact.findOneAndUpdate(
      { workspaceId, factId: f.factId },
      { ...f, workspaceId },
      { upsert: true, new: true }
    );
  }
  console.log(`[Seeder] Seeded ${facts.length} facts.`);

  // 4. Seed Terms (~10)
  for (const t of terms) {
    await Term.findOneAndUpdate(
      { workspaceId, preferred: t.preferred },
      { ...t, workspaceId },
      { upsert: true, new: true }
    );
  }
  console.log(`[Seeder] Seeded ${terms.length} terms.`);

  // 5. Seed Assets (~4)
  for (const a of assets) {
    await Asset.findOneAndUpdate(
      { workspaceId, name: a.name },
      { ...a, workspaceId },
      { upsert: true, new: true }
    );
  }
  console.log(`[Seeder] Seeded ${assets.length} assets.`);

  // 6. Seed Sample Drafts (3 drafts with deliberate errors)
  const creatorUser = userMap['creator'];
  for (const sd of sampleDrafts) {
    let draft = await Draft.findOne({ workspaceId, title: sd.title });
    if (!draft) {
      draft = await Draft.create({
        workspaceId,
        title: sd.title,
        channel: sd.channel,
        intent: sd.intent,
        content: sd.content,
        status: 'draft',
        createdBy: creatorUser ? creatorUser._id : null,
        creatorName: creatorUser ? creatorUser.name : 'Aarav Mehta'
      });

      // Create initial revision
      const revision = await Revision.create({
        draftId: draft._id,
        revisionNumber: 1,
        content: draft.content,
        author: creatorUser ? creatorUser.name : 'Aarav Mehta',
        authorRole: 'creator',
        note: 'Initial draft submission'
      });

      draft.currentRevisionId = revision._id;
      await draft.save();

      // Precompute sample review findings (T15)
      let sampleFindings = [];
      if (sd.title.includes('Monsoon Roast')) {
        sampleFindings = [
          {
            quote: 'voted the best coffee in India by every real connoisseur',
            category: 'claims',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'clause',
            sourceId: 'G-15',
            sourceText: 'Clause G-15: Never publish unsupported absolute superlatives such as "best coffee in India".',
            reason: 'Publishes an unsupported superlative without national certification.',
            suggestion: 'crafted with exceptional care by our farming partners'
          },
          {
            quote: 'mud',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "mud" → Preferred: "specialty coffee"',
            reason: 'Uses casual derogatory coffee slang.',
            suggestion: 'specialty coffee'
          },
          {
            quote: 'cheap',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "cheap" → Preferred: "accessible luxury"',
            reason: 'Dilutes brand craft premium.',
            suggestion: 'accessible luxury'
          },
          {
            quote: 'java',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "java" → Preferred: "specialty coffee"',
            reason: 'Colloquial slang prohibited in collateral.',
            suggestion: 'specialty coffee'
          },
          {
            quote: '₹199 per 250g bag',
            category: 'claims',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'fact',
            sourceId: 'F-02',
            sourceText: 'Fact F-02: Retail price of 250g Monsoon Malabar Reserve roast is ₹499.',
            reason: 'Retail price contradicts approved master price (₹499).',
            suggestion: '₹499 per 250g bag'
          },
          {
            quote: "You'd have to be stupid not to order right now before our inventory vanishes!",
            category: 'tone',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'clause',
            sourceId: 'G-01',
            sourceText: 'Clause G-01: Prohibits aggressive sales pressure, insults, and urgency baiting.',
            reason: 'Condescending urgency insult violates artisanal respectful voice.',
            suggestion: 'We invite you to experience this limited seasonal release.'
          },
          {
            quote: 'Click here',
            category: 'accessibility',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-LINK-TEXT',
            sourceText: 'WCAG 2.4.4 & G-11: Ambiguous link anchor text.',
            reason: 'Non-descriptive trigger phrase violates screen-reader navigation.',
            suggestion: 'Explore the collection'
          }
        ];
      } else if (sd.title.includes('Tasting Weekend')) {
        sampleFindings = [
          {
            quote: 'DO NOT MISS THIS EXCLUSIVE OPPORTUNITY',
            category: 'accessibility',
            severity: 'medium',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-ALLCAPS',
            sourceText: 'Clause G-13: Avoid entire headlines in ALL CAPS.',
            reason: 'ALL-CAPS shouting impairs assistive screen readers.',
            suggestion: 'Do Not Miss This Exclusive Opportunity'
          },
          {
            quote: '!!!',
            category: 'tone',
            severity: 'medium',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-EXCLAMATION',
            sourceText: 'Clause G-01: Prohibits urgency punctuation.',
            reason: 'Excessive punctuation creates false panic.',
            suggestion: '.'
          },
          {
            quote: 'October 1st',
            category: 'claims',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'fact',
            sourceId: 'F-04',
            sourceText: 'Fact F-04: Estate tours run exclusively from November 15 to February 28.',
            reason: 'Date contradicts official harvest tourism schedule.',
            suggestion: 'November 15th'
          },
          {
            quote: '[Image: Photo of estate sun deck]',
            category: 'accessibility',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-IMAGE-ALT',
            sourceText: 'Clause G-12: Must provide descriptive alt text.',
            reason: 'Missing detailed scene and lighting description.',
            suggestion: '[Image: Sun-drenched timber tasting deck overlooking Arabica hills]'
          },
          {
            quote: 'click here',
            category: 'accessibility',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-LINK-TEXT',
            sourceText: 'WCAG 2.4.4: Descriptive link text.',
            reason: 'Ambiguous call to action.',
            suggestion: 'explore the collection'
          }
        ];
      } else if (sd.title.includes('Cold Brew')) {
        sampleFindings = [
          {
            quote: 'junk coffee',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "junk coffee" → Preferred: "commercial coffee"',
            reason: 'Derogatory competitor reference.',
            suggestion: 'commercial coffee'
          },
          {
            quote: '450mg of pure organic caffeine per can',
            category: 'claims',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'fact',
            sourceId: 'F-05',
            sourceText: 'Fact F-05: Nitro Cold Brew cans contain exactly 180mg of naturally extracted caffeine.',
            reason: 'Caffeine concentration contradicts certified specification (180mg).',
            suggestion: '180mg of naturally extracted caffeine per can'
          },
          {
            quote: 'cures morning fatigue permanently and guarantees 100% focus all day long',
            category: 'claims',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'clause',
            sourceId: 'G-17',
            sourceText: 'Clause G-17: Never claim medical, pharmacological, or permanent health cures.',
            reason: 'Prohibited medical cure claim.',
            suggestion: 'supports natural alertness and daily morning focus'
          },
          {
            quote: 'plantation beans',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "plantation beans" → Preferred: "Coorg Estate Reserve"',
            reason: 'Respect regional estate naming standard.',
            suggestion: 'Coorg Estate Reserve'
          },
          {
            quote: 'bargain',
            category: 'terminology',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'term',
            sourceId: 'TERM-BANNED',
            sourceText: 'Banned: "bargain" → Preferred: "accessible luxury"',
            reason: 'Dilutes craft identity.',
            suggestion: 'accessible luxury'
          },
          {
            quote: 'Tap here',
            category: 'accessibility',
            severity: 'high',
            confidence: 'clear',
            sourceType: 'rule',
            sourceId: 'RULE-LINK-TEXT',
            sourceText: 'WCAG 2.4.4: Descriptive link text.',
            reason: 'Ambiguous call to action.',
            suggestion: 'explore the collection'
          }
        ];
      }

      // Compute exact character offsets on draft text
      const populatedFindings = sampleFindings.map(f => {
        const start = draft.content.indexOf(f.quote);
        const end = start !== -1 ? start + f.quote.length : 0;
        return {
          draftId: draft._id,
          revisionId: revision._id,
          ...f,
          start: Math.max(0, start),
          end: Math.max(0, end),
          status: 'open',
          createdAt: new Date()
        };
      });

      if (populatedFindings.length > 0) {
        await Finding.insertMany(populatedFindings);

        // Store precomputed cache entry (T15)
        const cacheKey = computeReviewHash(draft.content, draft.intent, workspace.version || 1);
        await ReviewCache.findOneAndUpdate(
          { cacheKey },
          {
            cacheKey,
            workspaceId,
            draftId: draft._id,
            findings: populatedFindings,
            aiUsed: true,
            isPrecomputedSample: true,
            createdAt: new Date()
          },
          { upsert: true, new: true }
        );
      }

      // Log creation
      await AuditLog.create({
        workspaceId,
        draftId: draft._id,
        action: 'create_draft',
        actor: creatorUser ? creatorUser.name : 'Aarav Mehta',
        actorRole: 'creator',
        details: { title: draft.title, channel: draft.channel }
      });
      console.log(`[Seeder] Seeded sample draft: "${draft.title}" with initial Revision`);
    }
  }

  console.log('[Seeder] Brewline Coffee Co. seeded successfully.');
  return { workspace, userMap };
}

module.exports = {
  seedBrewlineWorkspace
};

if (require.main === module) {
  const path = require('path');
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '..', '.env');
  dotenv.config({ path: envPath });

  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB. Running seeder...');
      await seedBrewlineWorkspace({ forceReset: process.argv.includes('--reset') });
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}
