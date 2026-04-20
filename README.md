# @goodness.inc/contentful-bulk-webhook-trigger

Given a Contentful contentType, iterate through each entry and invoke provided webhook with a payload that is similar to Contentful webhooks. The expected use case would be trigger routes that sync those entries to Algolia. You would use this after making changes in your entry syncing route and you want to update all records.

## Usage

```sh
npx @goodness.inc/contentful-bulk-webhook-trigger
```

You'll be prompted interactively for any values not provided as arguments:

- Space ID (`--space`)
- Content Delivery API Access Token (`--access-token`)
- Content Type ID (`--content-type`)
- Webhook URL (`--webhook-url`)

To run non-interactively (e.g. in CI), pass all arguments directly:

```sh
npx @goodness.inc/contentful-bulk-webhook-trigger \
  --space <spaceId> \
  --access-token <token> \
  --content-type <contentTypeId> \
  --webhook-url <url>
```

Your webhook will be invoked with a payload like:

```js
{
  sys: {
    type: 'Entry',
    id: 'YOUR ENTRY ID',
    contentType: {
      sys: {
        id: 'YOUR CONTENT ID',
      },
    },
  },
}
```

## Contributing

To work on this locally, run `npm link` from this project to create a global symlink to this dir. Then, in one terminal run `yarn dev` (to build on code change) and in another run `contentful-bulk-webhook-trigger` everytime you want to test execute.
