const path = require('path');
const fs = require('fs');
const { Client, GatewayIntentBits, REST, Routes, Collection, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { config, configCommands } = require(path.join(process.cwd(), 'core/config'));
const { sendLog } = require(path.join(process.cwd(), 'core/sendLog'));
const { errorReply, infoReply } = require(path.join(process.cwd(), 'core/Reply'));
const { getHitokoto } = require(path.join(process.cwd(), 'util/getHitokoto'));

// Discord bot 設定
const TOKEN = config.Startup.token; // 讀取機器人 TOKEN
const CLIENT_ID = config.Startup.clientID; //應用程式ID
const READY_TYPE = config.Startup.activityType; // 讀取狀態類型
const STATUS_TYPE = config.Startup.StatusType;
const BOTNICKNAME = configCommands.about.botNickname;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});
sendLog(client, '✅ 創建 Discord 客戶端成功！');

// 載入指令
client.commands = new Collection();
const commands = [];

function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.isFile() && file.name.endsWith('.js')) {
            const command = require(path.resolve(fullPath));
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            sendLog(client, `✅ 已載入指令：${file.name}`);
        }
    }
}

loadCommands('./commands');

// 註冊指令
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        sendLog(client, '✅ 指令註冊完成！');
    } catch (error) {
        sendLog(client, '❌ 註冊指令時發生錯誤：', "ERROR", error);
    }
})();

// 事件：處理指令
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            // 處理 Slash Command
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        } else if (interaction.isModalSubmit()) {
            // 處理 Modal 提交
            const command = client.commands.find(cmd => cmd.modalSubmit);
            if (command && command.modalSubmit) {
                await command.modalSubmit(interaction);
            }
        } else if (interaction.isButton()) {
            if (interaction.customId === 'openChatButton') {
                // 創建 Modal
                const modal = new ModalBuilder()
                    .setCustomId('chatModal')
                    .setTitle(`與${BOTNICKNAME}聊天`);

                // 訊息輸入
                const messageInput = new TextInputBuilder()
                    .setCustomId('message')
                    .setLabel("輸入訊息")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
                await interaction.showModal(modal);
            }
        }
    } catch (error) {
        console.error(error);
        errorReply(interaction, '**執行指令時發生錯誤**');
    }
});

// 當機器人啟動時，發送日誌訊息到指定頻道
client.once('ready', async () => {
    sendLog(client, `✅ 機器人已啟動！以「${client.user.tag}」身分登入！在 ${client.guilds.cache.size} 個伺服器提供服務！`);

    try {
        // 獲取短句
        const { hitokotoText } = await getHitokoto();

        // 設定機器人活動狀態
        client.user.setActivity(hitokotoText, { type: READY_TYPE });
        client.user.setStatus(STATUS_TYPE);
        sendLog(client, `✅ 已設定活動狀態：${STATUS_TYPE} ${READY_TYPE} ${hitokotoText}`);
    } catch (error) {
        sendLog(client, "❌ 無法獲取 Hitokoto API 資料：", "ERROR", error);
    }
});

client.login(TOKEN);