#!/usr/bin/env node
import {input, password} from '@inquirer/prompts';
import * as contentful from 'contentful';

// Main execution function
(async () => {
  const {space, accessToken, contentType, webhookUrl} = await askQuestions();

  // Fetch all entries for the given content type
  console.log('Fetching all entries...');
  const entries = await getAllEntries({space, accessToken, contentType});
  console.log(`Fetched ${entries.length} entries`);

  // Invoke webhook for each entry, skipping over errors
  for (const [i, entry] of entries.entries()) {
    console.log(`Invoking webhook for entry ${i + 1} (${entry.sys.id})`);
    try {
      await invokeWebhook({webhookUrl, entry});
    } catch (error) {
      console.error(`Error on: ${entry.sys.id}`);
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }
})();

// Ask all the questions and return the answers as an object
type Questions = Awaited<ReturnType<typeof askQuestions>>;
async function askQuestions() {
  const space = await input({
    message: `Space ID`,
    required: true,
  });
  const accessToken = await password({
    message: `Content Delivery API Access Token`,
    mask: '*',
  });
  const contentType = await input({
    message: `Content Type ID`,
    required: true,
  });
  const webhookUrl = await input({
    message: `Webhook URL`,
    required: true,
  });
  return {space, accessToken, contentType, webhookUrl};
}

// Get all entries for the given content type at once
async function getAllEntries({
  space,
  accessToken,
  contentType,
}: Pick<Questions, 'space' | 'accessToken' | 'contentType'>) {
  const client = contentful.createClient({
    space,
    accessToken,
  });

  const limit = 100;
  let skip = 0;
  let total = 0;
  let allItems: any[] = [];

  do {
    const response = await client.getEntries({
      content_type: contentType,
      limit,
      skip,
    });

    allItems = allItems.concat(response.items);
    total = response.total;
    skip += limit;
  } while (skip < total);

  return allItems;
}

// Invoke the webhook with the given entry as payload
async function invokeWebhook({
  webhookUrl,
  entry,
}: Pick<Questions, 'webhookUrl'> & {entry: contentful.Entry<any>}) {
  const payload = {
    sys: {
      type: 'Entry',
      id: entry.sys.id,
      contentType: {
        sys: {
          id: entry.sys.contentType.sys.id,
        },
      },
    },
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
