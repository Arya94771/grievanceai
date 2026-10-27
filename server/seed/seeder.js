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
  AiUseLog
} = require('../models');

const {
  clauses,
  facts,
  terms,
  assets,
  demoUsers,
  sampleDrafts
} = require('./seedData');

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
