-- Enable Realtime for the notifications table
alter publication supabase_realtime add table notifications;

-- RLS: users can only see their own notifications
alter table notifications enable row level security;

create policy "users can read own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "users can update own notifications"
  on notifications for update
  using (user_id = auth.uid());
