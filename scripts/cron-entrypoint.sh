#!/bin/sh
set -e

cat > /etc/crontabs/root << EOF
# All times are UTC+7 (Asia/Bangkok) expressed as UTC
# 01:00 UTC = 08:00 Thailand
0 1 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" http://app:3000/api/cron/generate-tasks
0 1 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d7"
0 1 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d1"
# 02:00 UTC = 09:00 Thailand
0 2 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=escalation"
EOF

exec crond -f -l 6
