#!/bin/sh
set -e

cat > /etc/crontabs/root << EOF
# TZ=Asia/Bangkok is set in the container — all times are Thailand time
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" http://app:3000/api/cron/generate-tasks
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d7"
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=d1"
0 8 * * * wget -qO- --header "Authorization: Bearer ${CRON_SECRET}" --post-data "" "http://app:3000/api/cron/notify?type=escalation"
EOF

exec crond -f -l 6
