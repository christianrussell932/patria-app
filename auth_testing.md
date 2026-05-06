# Emergent Auth — Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
# Test auth endpoint
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints (examples)
curl -X GET "$REACT_APP_BACKEND_URL/api/household/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing
```
await page.context.add_cookies([{
  "name": "session_token",
  "value": "YOUR_SESSION_TOKEN",
  "domain": "<host without https>",
  "path": "/",
  "httpOnly": true,
  "secure": true,
  "sameSite": "None"
}]);
await page.goto("https://your-app.com/today");
```

## Quick Debug
```
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
"
```

## Checklist
- [ ] User document has user_id (custom UUID); _id excluded from API
- [ ] Session user_id matches user.user_id
- [ ] All queries use {"_id": 0} projection
- [ ] Backend reads cookie session_token first, then Authorization header
- [ ] /api/auth/me returns user data with cookie or bearer
- [ ] AppRouter detects session_id in URL hash synchronously
- [ ] AuthCallback uses useRef hasProcessed flag

## Success Indicators
- /api/auth/me returns user JSON
- /today loads without redirect after cookie set
- Household CRUD endpoints accept session
