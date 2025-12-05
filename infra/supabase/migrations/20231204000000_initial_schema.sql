-- Create targets table
create table targets (
  id uuid default gen_random_uuid() primary key,
  owner_wallet text not null,
  chain text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_discovered_at timestamp with time zone
);

-- Create tracked_wallets table
create type wallet_direction as enum ('sent_to', 'received_from', 'recent_sent', 'recent_received');

create table tracked_wallets (
  id uuid default gen_random_uuid() primary key,
  target_id uuid references targets(id) on delete cascade not null,
  address text not null,
  direction wallet_direction not null,
  metric_count integer default 0,
  metric_total_value numeric default 0,
  discovered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(target_id, address)
);

-- Create tx_events table
create type tx_type as enum ('incoming', 'outgoing');

create table tx_events (
  id uuid default gen_random_uuid() primary key,
  tx_hash text not null,
  block_number bigint not null,
  chain text not null,
  from_address text not null,
  to_address text not null,
  value numeric not null,
  token_address text,
  token_symbol text,
  token_decimals integer,
  tracked_address text not null,
  target_id uuid references targets(id) on delete cascade not null,
  type tx_type not null,
  raw_payload jsonb,
  seen_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notifications table
create table notifications (
  id uuid default gen_random_uuid() primary key,
  tx_hash text not null,
  channel text not null,
  payload jsonb not null,
  delivered_at timestamp with time zone,
  status text default 'pending'
);

-- Create indices
create index idx_tracked_wallets_address on tracked_wallets(address);
create index idx_tx_events_tx_hash on tx_events(tx_hash);
create index idx_targets_owner_wallet on targets(owner_wallet);
