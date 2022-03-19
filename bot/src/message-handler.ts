import { Client, GuildMember, Message, User } from 'discord.js'
import log from './log.js'
import objectToForm from './object-to-form.js'

import fetch from 'node-fetch'

class MessageBucket {
  messages: Message[] = []
  push (message: Message): void {
    if (message.content.length <= 0 || message.author.bot) return
    this.messages.push(message)
    if (this.messages.length > 10) this.messages.shift()
  }

  randomAuthor (): User {
    const message = this.messages[Math.floor(Math.random() * this.messages.length)]
    return message?.author ?? this.messages[0].author
  }

  collectContext (): string {
    const context = this.messages.map(m => `${m.author.username}>>> ${m.content}`)
    this.messages = []
    return context.slice(0, -1).join('\n')
  }
}

const buckets: Map<string, MessageBucket> = new Map()

export default (client: Client) => async (message: Message) => {
  try {
    if (message.author.bot) return
    if (message.channel.type !== 'GUILD_TEXT') return
    if (!message.guild) return

    if (!buckets.has(message.channelId)) buckets.set(message.channelId, new MessageBucket())
    const bucket = buckets.get(message.channelId)
    if (!bucket) return
    bucket.push(message)

    // 2% chance of triggering the chatbot
    if (Math.random() > 0.01 && client.user?.id && !message.mentions.has(client.user?.id)) return

    const author = bucket.randomAuthor()
    const context = bucket.collectContext()

    log(`Triggered chatbot for ${message.channel.name} with context:`)
    log(context)

    const res = await fetch('http://localhost/' + message.channelId, { method: 'POST', body: objectToForm({ context: `${context}\n${author.username}>>> ` }) })
    if (res.status !== 200) return

    const generated = await (await res.text()).substring(context.length)
    if (generated.length <= 0) return

    /// capture "(username)>>> (message)"
    const messages: Array<{ author: GuildMember, content: string }> = []
    const regex = /\n(.+)>>>(.+)/g
    let m = regex.exec(generated)
    const foundUsers: {[key: string]: GuildMember} = {}

    // itterate over all matches and find users based on their username
    while (m !== null) {
      if (m.length !== 3) continue
      const user = foundUsers[m[1]] ?? (await message.guild.members.search({ query: m[1] })).first()
      if (!user) continue
      foundUsers[m[1]] = user
      messages.push({ author: user, content: m[2] })
      m = regex.exec(generated)
    }

    log(`Generated ${messages.length} messages`)

    // find the webhook, if it doesnt exist: create it
    const webhooks = await message.guild.fetchWebhooks()
    let webhook = webhooks.find(w => w.name === 'Artificial Personality')
    if (!webhook) {
      webhook = await message.channel.createWebhook('Personality', {
        avatar: client.user?.avatarURL()
      })
    }

    // send the messages
    async function sendloop (i: number, isMe: boolean): Promise<void> {
      // in 20% of cases, send the next message even if its another user
      if (!webhook || (!isMe && Math.random() > 0.3) || i >= messages.length - 1) return

      await webhook.send({
        content: messages[i].content,
        username: messages[i].author.displayName,
        avatarURL: messages[i].author.avatarURL() ?? messages[i].author.user.avatarURL() ?? undefined
      })
      await new Promise(r => setTimeout(r, Math.random() * 2500))
      await sendloop(i + 1, i < messages.length - 1 && messages[i + 1].author.id === author.id)
    }

    await sendloop(0, true)

    log('Messages sent.')
  } catch (e) {
    log.error(e)
  }
}
