import { Message } from 'discord.js'
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums'
import { Command } from '../types/command.js'
import log from '../log.js'
import fs from 'fs/promises'
import fsExists from 'fs.promises.exists'
import path from 'path'
import trainingQueue from '../training-queue.js'

const dataPath = path.resolve('..', 'data')
const personalitiesPath = path.join(dataPath, 'personalities')

log(personalitiesPath)

void fsExists(dataPath)
  .then(async exists => { if (!exists) await fs.mkdir(dataPath) })
  .then(async () => fsExists(personalitiesPath))
  .then(async exists => { if (!exists) await fs.mkdir(personalitiesPath) })

export default {
  name: 'create_personality',
  description: 'Create a new personality',
  options: [
    {
      name: 'sample_size',
      description: 'How many messages to sample',
      type: ApplicationCommandOptionTypes.NUMBER,
      required: true,
      minValue: 100,
      maxValue: 25000
    }
  ],
  handler: async (interaction) => {
    const { channel, options } = interaction
    if (!interaction.channel || !channel || channel.type !== 'GUILD_TEXT') return

    const sample = options.getNumber('sample') ?? 1000

    if (await fsExists(path.join(personalitiesPath, `${channel.id}.json`))) {
      await interaction.reply({
        embeds: [
          {
            title: '<:icons_Wrong:859388130636988436> Personality already exists.',
            description: 'A personality already exists for this server. Please delete it before creating a new one.',
            color: 0xf73920
          }
        ]
      })
      return
    }

    await interaction.reply({
      embeds: [
        {
          title: '<:icons_settings:859388128040976384> Configuring personality...',
          color: 0x5b9ef0
        }
      ]
    })

    const statusMsg = await interaction.fetchReply() as Message

    function progressBar (percent: number): string {
      return `\`[${'■'.repeat(Math.ceil(percent / 5))}${' '.repeat(20 - Math.floor(percent / 5))}]\` ${Math.floor(percent)}%`
    }

    // eslint-disable-next-line no-async-promise-executor
    const messages = await new Promise<any[]>(async (resolve, reject) => {
      const messages: any[] = []
      let lastMessageId: string | undefined
      const reportTimer: NodeJS.Timer = setInterval(() => {
        void statusMsg.edit({
          embeds: [
            {
              title: '<:icons_clouddown:860133546776985610> Collecting message samples...',
              description: progressBar((messages.length / sample) * 100),
              color: 0x5b9ef0
            }
          ]
        })
      }, 5000)
      try {
        while (messages.length < sample) {
          const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId })
          if (fetchedMessages.size === 0) break
          const messageArray = Array.from(fetchedMessages.values()).filter(m => m.content.length > 0).reverse()
          messages.push(...messageArray.map((m: Message, i: number) => ({
            content: m.content,
            author: m.author.username,
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

    await statusMsg.edit({
      embeds: [
        {
          title: '<:icons_spark:860123643722727444> Samples collected. Training personality...',
          color: 0x5b9ef0
        }
      ]
    })

    const filePath = path.join(personalitiesPath, `${channel.id}.json`)

    const personality = {
      messages: messages,
      filePath,
      channelId: channel.id,
      statusMsgId: statusMsg.id
    }

    await fs.writeFile(filePath, JSON.stringify(personality))

    void trainingQueue.push(channel.id, statusMsg)
  }
} as Command
