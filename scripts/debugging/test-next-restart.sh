npm run dev -- -p 3005 > dev.log 2>&1 &
NEXT_PID=$!
sleep 5
echo "Hitting GET /api/v1/conversations"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/v1/conversations?limit=100
echo ""
kill $NEXT_PID
