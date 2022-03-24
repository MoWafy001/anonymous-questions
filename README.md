This is an app where you can write a question and let people answer it anonymouslly. Only the question creator need to create an account, so that the answers will be sent to his/her email inbox

# Env Variables

* PGDATABASE
* PGHOST
* PGPASSWORD
* PGPORT ( usually `5432` )
* PGUSER
* SERVEREMAIL ( `must be a Gmail`, unless you modify the code )
* SERVEREMAILPASSWORD
### *These two may be needed if a secure connection is required*
* NODE_TLS_REJECT_UNAUTHORIZED=`'0'`
* PGSSLMODE=`"require"`

# Install
It is a node js app, so it is very simple.
1. create a `.env with the env variables above`
2. install the packages
```
npm install
```
3. run it
```
node index.js
```
