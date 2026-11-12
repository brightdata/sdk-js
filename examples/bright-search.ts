import { bdclient, BRDError } from '@brightdata/sdk';

// Running this example makes one real search using configured SDK credentials.
const client = new bdclient();
try {
    const page = await client.search.business.companies(
        'US software companies with 50 to 500 employees',
        { mode: 'instant', view: 'summary', limit: 10 },
    );
    console.log(
        `Request: ${page.reqId}; coverage: ${page.meta.coverage_percent}%`,
    );
    for (const document of page.documents) {
        console.log(document.bright_id, document.data.name);
    }
} catch (error) {
    if (error instanceof BRDError && error.context) {
        console.error(
            error.name,
            error.context.statusCode,
            error.context.reqId,
        );
    }
    throw error;
} finally {
    await client.close();
}
