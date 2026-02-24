#!/bin/bash
# Disable scanner cron jobs to stop Alchemy/API usage (saves billing)
# Run with: ./disable-scanners.sh
# To re-enable: ./setup-cron.sh --auto-setup

set -e

# Remove scanner jobs, keep DB optimization and cleanup (no API cost)
crontab -l 2>/dev/null | grep -v 'cron-unified\.sh' | grep -v 'cron-funds\.sh' | grep -v 'cron-funds-high\.sh' | grep -v 'cron-revalidate\.sh' | grep -v '^$' > /tmp/crontab.new
echo "" >> /tmp/crontab.new
echo "# Scanner jobs disabled $(date) - no Alchemy/API calls" >> /tmp/crontab.new
echo "# To re-enable: cd $(dirname "$0")/.. && ./cron/setup-cron.sh --auto-setup" >> /tmp/crontab.new
crontab /tmp/crontab.new
rm -f /tmp/crontab.new

echo "Scanner cron jobs disabled. Alchemy/API usage will stop."
echo "DB optimization and log cleanup still run (no external API cost)."
crontab -l
