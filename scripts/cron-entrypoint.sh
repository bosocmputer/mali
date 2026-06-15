#!/bin/sh
set -e

cat > /etc/crontabs/root << EOF
0 1 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" http://app:3000/api/cron/generate-tasks
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d7"
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d1"
0 9 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=escalation"
EOF

exec crond -f -l 6
