import 'module-alias/register.js'
import { ApplicationCommandDataResolvable, Client, CommandInteraction, Intents } from 'discord.js'
import log from './log.js'
import fs from 'fs'
import { Command } from './types/command.js'
import messageHandler from './message-handler.js'

async function run (): Promise<void> {
  const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES] })

  const commandHandlers = new Map<string, (interaction: CommandInteraction) => void>()
  const commandFiles = fs.readdirSync('./out/commands').filter(file => file.endsWith('.js'))
  const commands: Command[] = []

  for (const file of commandFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command = await import(`./commands/${file}`)
    commands.push(command.default)
    commandHandlers.set(command.default.name, command.default.handler)
  }

  client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return

    const handler = commandHandlers.get(interaction.commandName)
    if (!handler) return

    handler(interaction)
  })

  client.on('messageCreate', messageHandler(client))

  client.on('ready', async () => {
    log.info(`Logged in as ${client.user?.tag}`)
    log.info(`Serving ${client.guilds.cache.size} guilds`)
    log.info('Registering commands...')
    await client.application?.commands.set(commands as ApplicationCommandDataResolvable[])
    log.info('Commands registered.')
  })

  void client.login(process.env.DISCORD_TOKEN)
}

void run()
