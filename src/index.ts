#!/usr/bin/env node
import {input, password} from '@inquirer/prompts';
import * as contentful from 'contentful';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

// Shared question definitions — single source of truth for CLI args
// and interactive prompts
const QUESTIONS = [
  {key: 'space', message: 'Space ID', type: 'input'} as const,
  {
    key: 'accessToken',
    message: 'Content Delivery API Access Token',
    type: 'password',
  } as const,
  {key: 'contentType', message: 'Content Type ID', type: 'input'} as const,
  {key: 'webhookUrl', message: 'Webhook URL', type: 'input'} as const,
];

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
  // Register all questions as CLI options, then parse argv
  let yargsInstance = yargs(hideBin(process.argv)).help();
  for (const q of QUESTIONS) {
    const kebabKey = toKebab(q.key);
    yargsInstance = yargsInstance.option(kebabKey, {
      type: 'string',
      describe: q.message,
    });
  }
  const argv = yargsInstance.parseSync() as Record<string, string | undefined>;

  // For each question, use the CLI arg value if provided, else prompt
  // interactively
  const answers: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const kebabKey = toKebab(q.key);
    const cliValue = argv[kebabKey];
    if (cliValue) {
      answers[q.key] = cliValue;
    } else if (q.type === 'password') {
      answers[q.key] = await password({message: q.message, mask: '*'});
    } else {
      answers[q.key] = await input({message: q.message, required: true});
    }
  }

  return answers as {[K in (typeof QUESTIONS)[number]['key']]: string};
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

// Convert camelCase to kebab-case
function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
