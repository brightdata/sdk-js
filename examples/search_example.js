require('dotenv').config();
const { bdclient } = require('@brightdata/sdk');

// put your API key in the apiKey option or BRIGHTDATA_API_TOKEN env variable
const client = new bdclient();
const result = await client.search.google(['Burger', 'pizza']);

console.log(result);
