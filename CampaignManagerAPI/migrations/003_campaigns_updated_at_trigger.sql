-- §1.2a — PostgreSQL 14+: EXECUTE FUNCTION. On PG 11–13 use EXECUTE PROCEDURE instead.

CREATE OR REPLACE FUNCTION campaigns_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;

CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION campaigns_set_updated_at();
