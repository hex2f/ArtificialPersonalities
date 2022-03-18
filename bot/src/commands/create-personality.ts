import { Message, User } from 'discord.js'
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums'
import { Command } from '~/types/command'
import log from '~/log'
import fs from 'fs/promises'
import fsExists from 'fs.promises.exists'
import path from 'path'
import sha256 from 'sha256'

const dataPath = path.join(__dirname, '..', '..', '..', 'data')
const personalitiesPath = path.join(dataPath, 'personalities')

void fsExists(dataPath)
  .then(async exists => { if (!exists) await fs.mkdir(dataPath) })
  .then(async () => fsExists(personalitiesPath))
  .then(async exists => { if (!exists) await fs.mkdir(personalitiesPath) })

export default {
  name: 'create_personality',
  description: 'Create a new personality',
  options: [
    {
      name: 'based_on',
      description: 'The user to create the personality for',
      type: ApplicationCommandOptionTypes.USER,
      required: true
    },
    {
      name: 'name',
      description: 'The name of the personality',
      type: ApplicationCommandOptionTypes.STRING,
      required: false
    },
    {
      name: 'avatar_url',
      description: 'The avatar URL of the personality',
      type: ApplicationCommandOptionTypes.STRING,
      required: false
    },
    {
      name: 'sample',
      description: 'How many messages to sample',
      type: ApplicationCommandOptionTypes.NUMBER,
      required: false,
      minValue: 100,
      maxValue: 5000
    }
  ],
  handler: async (interaction) => {
    const { channel, options } = interaction
    if (!channel) return

    const user = options.getUser('based_on') as User
    const name = options.getString('name') ?? user.username
    const avatarUrl = options.getString('avatar_url') ?? user.avatarURL()
    const sample = options.getNumber('sample') ?? 1000

    await interaction.reply(`Creating personality for ${user.username}...`)

    // eslint-disable-next-line no-async-promise-executor
    const messages = await new Promise<any[]>(async (resolve, reject) => {
      const messages: any[] = []
      let lastMessageId: string | undefined
      const reportTimer: NodeJS.Timer = setInterval(() => {
        void interaction.editReply(`${messages.length}/${sample} messages fetched...`)
      }, 5000)
      try {
        while (messages.length < sample) {
          const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId })
          if (fetchedMessages.size === 0) break
          const messageArray = Array.from(fetchedMessages.values()).filter(m => m.content.length > 0)
          messages.push(...messageArray.slice(5).filter(m => m.author.id === user.id).map((m: Message, i: number) => ({
            content: m.content,
            context: messageArray.slice(i - 5, i).map(m => ({ content: m.content, author: m.author.username }))
          })))
          lastMessageId = fetchedMessages.last()?.id
        }
      } catch (error) {
        log.error(error)
      }
      clearInterval(reportTimer)
      resolve(messages)
    })

    await interaction.editReply('Samples have been collected. Once training has finished in the background, the personality will automatically be activated. This may take several hours.')

    const personality = {
      name: name,
      avatarUrl: avatarUrl,
      basedOn: { name: user.username, id: user.id },
      hash: sha256(user.username + name),
      messages: messages
    }

    const filePath = path.join(personalitiesPath, `${personality.hash}.json`)

    await fs.writeFile(filePath, JSON.stringify(personality))
  }
} as Command
