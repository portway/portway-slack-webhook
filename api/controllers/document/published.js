const axios = require('axios')

// Order matters for replacement, so arrays
const slackReplaceChars = [
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;']
]

const helpers = {
  humanReadableDate: (dateStr) => {
    const date = new Date(dateStr)
    return date.toDateString()
  },

  replaceSlackSpecialChars: (string) => {
    let newString = string
    slackReplaceChars.forEach(charSet => {
      newString = newString.replace(charSet[0], charSet[1])
    })
    return newString
  }
}

const slackBlocks = {
  context: (doc) => {
    return {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": `Created: *${helpers.humanReadableDate(doc.createdAt)}*`
        },
        {
          "type": "mrkdwn",
          "text": `Updated: *${helpers.humanReadableDate(doc.updatedAt)}*`
        },
        {
          "type": "mrkdwn",
          "text": `Slug: *${doc.slug}*`
        }
      ]
    }
  },

  header: (text) => {
    return {
      "type": "header",
      "text": {
        "type": "plain_text",
        text
      }
    }
  },

  divider: () => {
    return {
      type: "divider"
    }
  },

  section: (text) => {
    return {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        text
      }
    }
  },

  image: (field) => {
    return {
      "type": "image",
      "image_url": field.value,
      "alt_text": field.name,
      "title": {
        "type": "plain_text",
        "text": field.name
      },
    }
  }
}

// Converts Portway structuredText to slack blocks
function textToSlack(tags, options = {}) {
  return tags.map(tag => {
    if (tag.type === 'tag') {
      switch (tag.tag) {
        case 'hr': {
          // TODO: need to handle, Slack requires a new block for a divider
        }
        case 'p': {
          return textToSlack(tag.children) + '\n\n'
        }
        case 'strong': {
          return `*${textToSlack(tag.children)}*`
        }
        case 'em': {
          return `_${textToSlack(tag.children)}_`
        }
        case 's': {
          return `~${textToSlack(tag.children)}~`
        }
        case 'a': {
          return `<${tag.attrs.href}|${textToSlack(tag.children)}>`
        }
        case 'br': {
          return options.blockquote ? '\n >' : '\n'
        }
        case 'code': {
          return '```' + textToSlack(tag.children) + '```\n'
        }
        case 'inline_code': {
          return '`' + textToSlack(tag.children) + '`'
        }
        case 'blockquote': {
          const options = { blockquote: true }
          return tag.children.map(child => {
            // TODO: does not handle multiline quotes
            return `> ${textToSlack([child], options)}`
          })
        }
        case 'ul': {
          return `${textToSlack(tag.children)}\n`
        }
        case 'ol': {
          const options = { listCount: 0 }
          return `${textToSlack(tag.children, options)}\n`
        }
        case 'li': {
          if (options.hasOwnProperty('listCount')) {
            options.listCount += 1
          }
          const bullet = options.listCount ? `${options.listCount}.` : '-'
          return `${bullet} ${textToSlack(tag.children)}\n`
        }
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return `*${textToSlack(tag.children)}*\n`
        default:
          console.log(`############# MISSING TAG: ${tag.tag}`)
          return ''
      }
    }

    if (tag.type === 'text') {
      return helpers.replaceSlackSpecialChars(tag.data)
    }

  }).join('')
}

module.exports = {

  friendlyName: 'Published',

  description: 'Published document.',

  inputs: {

  },

  exits: {
    success: {
      description: 'Document pushed to Slack',
      responseType: 'jsonData', // invokes api/responses/jsonData
    }
  },

  fn: async function(inputs) {
    let data = this.req.body
    console.log(JSON.stringify(data, null, 2))

    const blocks = []
    blocks.push(slackBlocks.context(data.document))
    blocks.push(slackBlocks.header(data.document.name))

    const fields = data.document.fields.map(field => {
      switch(field.type) {
        // string
        case 1: {
          const string = `*${field.name}*: ${helpers.replaceSlackSpecialChars(field.value)}`
          return slackBlocks.section(string)
        }
        // text
        case 2: {
          const text = textToSlack(field.structuredValue)
          return slackBlocks.section(text)
        }
        // Number
        case 3: {
          const string = `*${field.name}*: ${String(field.value)}`
          return slackBlocks.section(string)
        }
        // Image
        case 4: {
          return slackBlocks.image(field)
        }
        // Date
        case 5: {
          const string = `*${field.name}*: ${helpers.humanReadableDate(field.value)}`
          return slackBlocks.section(string)
        }
        // File
        case 6: {
          const string = `*${field.name}*: ${String(field.value)}`
          return slackBlocks.section(string)
        }
      }
    })

    blocks.push(...fields)

    try {
      const url = sails.config.custom.slackIncomingWebhookURL
      await axios.post(url, { blocks })
    } catch(e) {
      if (typeof e.toJSON === 'function') {
        console.log(e.toJSON())
      } else {
        console.log(e)
      }
    }
    
    return data
  }

}
