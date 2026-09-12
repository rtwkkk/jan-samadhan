// @ts-nocheck
import { connectToDatabase } from '../client';
import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

function supabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function runPreflight() {
  console.log('========================================');
  console.log('WACRM MONGODB BACKFILL PREFLIGHT');
  console.log('========================================');

  const supabase = supabaseAdmin();
  if (!supabase) {
    console.log('\nSupabase credentials missing in environment.');
    console.log('Cannot connect to PostgreSQL. Preflight aborted gracefully.');
    console.log('\nMigration readiness:\n    NOT READY\n\nBlocking issues:\n- Missing Supabase credentials');
    process.exit(0);
  }

  await connectToDatabase();

  // --- 1. POSTGRES COUNTS ---
  const { count: accountsCount } = await supabase.from('accounts').select('id', { count: 'exact', head: true });
  let usersCount: any = 'N/A (Schema restricted)';
  try {
    const res = await supabase.from('auth.users').select('id', { count: 'exact', head: true });
    if (res.count !== null) usersCount = res.count;
  } catch (e) {}
  const { count: contactsCount } = await supabase.from('contacts').select('id', { count: 'exact', head: true });
  const { count: tagsCount } = await supabase.from('tags').select('id', { count: 'exact', head: true });
  const { count: convCount } = await supabase.from('conversations').select('id', { count: 'exact', head: true });
  const { count: msgCount } = await supabase.from('messages').select('id', { count: 'exact', head: true });
  let reactCount: any = 0;
  try {
    const res = await supabase.from('message_reactions').select('id', { count: 'exact', head: true });
    if (res.count !== null) reactCount = res.count;
  } catch (e) {}

  console.log('\nPostgreSQL source:');
  console.log(`  Accounts:       ${accountsCount}`);
  console.log(`  Users:          ${usersCount}`);
  console.log(`  Contacts:       ${contactsCount}`);
  console.log(`  Tags:           ${tagsCount}`);
  console.log(`  Conversations:  ${convCount}`);
  console.log(`  Messages:       ${msgCount}`);
  console.log(`  Reactions:      ${reactCount || 0}`);

  // --- 2. RELATIONSHIP VALIDATION ---
  let orphanContacts = 0, orphanConv = 0, orphanMsg = 0, orphanTags = 0;
  
  const { data: contactsData } = await supabase.from('contacts').select('id, account_id');
  if (contactsData) {
    orphanContacts = contactsData.filter(c => !c.account_id).length;
  }
  const { data: tagsData } = await supabase.from('tags').select('id, account_id');
  if (tagsData) {
    orphanTags = tagsData.filter(t => !t.account_id).length;
  }
  const { data: convData } = await supabase.from('conversations').select('id, account_id, contact_id');
  if (convData && contactsData) {
    const contactIds = new Set(contactsData.map(c => c.id));
    orphanConv = convData.filter(c => !c.account_id || !contactIds.has(c.contact_id)).length;
  }
  const { data: msgData } = await supabase.from('messages').select('id, conversation_id, message_id');
  if (msgData && convData) {
    const convIds = new Set(convData.map(c => c.id));
    orphanMsg = msgData.filter(m => !convIds.has(m.conversation_id)).length;
  }

  console.log('\nRelationship validation (Postgres):');
  console.log(`  Orphan contacts:       ${orphanContacts}`);
  console.log(`  Orphan conversations:  ${orphanConv}`);
  console.log(`  Orphan messages:       ${orphanMsg}`);
  console.log(`  Orphan tags:           ${orphanTags}`);

  // --- 3. DUPLICATE/CONFLICT VALIDATION ---
  let mongoIdConflicts = 0, phoneConflicts = 0, convConflicts = 0;
  let dupConvMsgId = 0, msgWithId = 0, msgWithoutId = 0;

  if (msgData) {
    const convMsgSet = new Set();
    msgData.forEach(m => {
      if (m.message_id) {
        msgWithId++;
        const key = `${m.conversation_id}_${m.message_id}`;
        if (convMsgSet.has(key)) dupConvMsgId++;
        else convMsgSet.add(key);
      } else {
        msgWithoutId++;
      }
    });
  }

  // Check MongoDB overlaps (just counting if Postgres ID exists in Mongo)
  if (contactsData) {
    const pgContactIds = contactsData.map(c => c.id);
    mongoIdConflicts += await Contact.countDocuments({ _id: { $in: pgContactIds } });
  }
  if (convData) {
    const pgConvIds = convData.map(c => c.id);
    mongoIdConflicts += await Conversation.countDocuments({ _id: { $in: pgConvIds } });
  }
  if (msgData) {
    const pgMsgIds = msgData.map(m => m.id);
    mongoIdConflicts += await Message.countDocuments({ _id: { $in: pgMsgIds } });
  }

  console.log('\nDuplicate/conflict validation:');
  console.log(`  Duplicate conversation/message IDs: ${dupConvMsgId}`);
  console.log(`  Messages with messageId:            ${msgWithId}`);
  console.log(`  Messages without messageId:         ${msgWithoutId}`);
  console.log(`  MongoDB ID conflicts:               ${mongoIdConflicts}`);
  console.log(`  Phone conflicts:                    (Requires deep scan)`);
  console.log(`  Conversation conflicts:             (Requires deep scan)`);

  // --- 4. UNMAPPED DATA ---
  console.log('\nUnmapped data:');
  console.log(`  Tables: message_reactions, broadcast_recipients, deals, pipelines (NOT YET MAPPED)`);
  console.log(`  Fields: messages.template_name (NOT YET MAPPED)`);

  console.log('\nMigration readiness:');
  const ready = (orphanContacts === 0 && orphanConv === 0 && orphanMsg === 0 && dupConvMsgId === 0) ? 'READY (Pending backfill logic)' : 'NOT READY';
  console.log(`    ${ready}`);
  
  if (ready === 'NOT READY') {
    console.log('\nBlocking issues:');
    if (orphanContacts > 0) console.log('- Contacts missing account_id');
    if (orphanConv > 0) console.log('- Conversations missing account_id or contact_id');
    if (orphanMsg > 0) console.log('- Messages missing conversation_id');
    if (dupConvMsgId > 0) console.log('- Duplicate (conversation_id, message_id) found in Postgres');
  }

  process.exit(0);
}

runPreflight().catch(err => {
  console.error('Preflight error:', err);
  process.exit(1);
});
