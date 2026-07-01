-- Enable Realtime for the messages table
-- Run in Supabase SQL editor or via supabase db push

-- Add table to the realtime publication
alter publication supabase_realtime add table messages;

-- RLS: users can only read messages in threads they belong to
alter table messages enable row level security;

create policy "thread participants can read messages"
  on messages for select
  using (
    exists (
      select 1 from message_threads
      where message_threads.id = messages.thread_id
        and (message_threads.buyer_id = auth.uid() or message_threads.seller_id = auth.uid())
    )
  );

create policy "thread participants can insert messages"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from message_threads
      where message_threads.id = messages.thread_id
        and (message_threads.buyer_id = auth.uid() or message_threads.seller_id = auth.uid())
    )
  );
