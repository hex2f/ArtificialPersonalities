import 'module-alias/register'
import { ApplicationCommandDataResolvable, Client, CommandInteraction, Intents } from 'discord.js'
import log from '~/log'
import fs from 'fs'
import { Command } from '~/types/command'

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] })

const commandHandlers = new Map<string, (interaction: CommandInteraction) => void>()
const commandFiles = fs.readdirSync('./out/commands').filter(file => file.endsWith('.js'))
const commands: Command[] = []

for (const file of commandFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const command = require(`./commands/${file}`).default
  commands.push(command)
  commandHandlers.set(command.name, command.handler)
}

client.on('interactionCreate', interaction => {
  if (!interaction.isCommand()) return

  const handler = commandHandlers.get(interaction.commandName)
  if (!handler) return

  handler(interaction)
})

client.on('ready', async () => {
  log.info(`Logged in as ${client.user?.tag}`)
  log.info(`Serving ${client.guilds.cache.size} guilds`)
  log.info('Registering commands...')
  await client.application?.commands.set(commands as ApplicationCommandDataResolvable[])
  log.info('Commands registered.')
})

void client.login(process.env.DISCORD_TOKEN)
