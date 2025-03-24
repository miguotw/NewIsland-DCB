const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { config, configCommands } = require(path.join(process.cwd(), 'core/config'));
const { sendLog } = require(path.join(process.cwd(), 'core/sendLog'));
const { errorReply, infoReply } = require(path.join(process.cwd(), 'core/Reply'));
const { chatWithOpenAI, exportChatHistory, deleteChatHistory } = require(path.join(process.cwd(), 'util/getNewIslandChat'));

// 導入設定檔內容
const EMBED_COLOR = config.embed.color.default;
const EMBED_EMOJI_LOADING = config.emoji.loading;
const EMBED_EMOJI_ERROR = config.emoji.error;
const BOTNICKNAME = configCommands.about.botNickname;
const INTRODUCE = configCommands.about.introduce;
const EMBED_EMOJI = configCommands.NewIslandChat.emoji;
const ADMIN_ROLE = configCommands.NewIslandChat.admin;

module.exports = {
    data: new SlashCommandBuilder()
        .setName(`與${BOTNICKNAME}諮詢`)
        .setDescription(`與${BOTNICKNAME}進行聊天或管理聊天歷史`)
        .addSubcommand(subcommand =>
            subcommand
            .setName('傳送訊息')
            .setDescription(`與${BOTNICKNAME}進行聊天`)
            .addStringOption(option =>
                option.setName('訊息')
                .setDescription(`輸入要發送給${BOTNICKNAME}的訊息`)
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
            subcommand
            .setName('管理操作')
            .setDescription('管理您的聊天歷史紀錄')
            .addStringOption(option =>
                option.setName('操作')
                .setDescription('選擇要執行的操作')
                .setRequired(true)
                .addChoices(
                    { name: '匯出聊天紀錄', value: 'export' },
                    { name: '刪除聊天紀錄', value: 'delete' },
                    { name: '創建聊天按鈕', value: 'create_button'}
                )
            )
        ),

        async execute(interaction) {
            try {
            const userId = interaction.user.id;
            const subcommand = interaction.options.getSubcommand();
                
            // 權限檢查器
            const checkAdmin = () => {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE)) {
                throw new Error('此指令需要管理員權限');
                }
            };

            switch (subcommand) {
                case '傳送訊息': {
                    // 啟用延遲回覆
                    await interaction.deferReply({ ephemeral: false });

                    const message = interaction.options.getString('訊息');
                    sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了指令：/與${BOTNICKNAME}諮詢 傳送訊息:${message}`, "INFO");
                    
                    // 取得 AI 回應
                    const chatResponse = await chatWithOpenAI(userId, message);
        
                    const embed = new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setTitle(`${EMBED_EMOJI} ┃ 與${BOTNICKNAME}諮詢`)
                        .addFields(
                            { name: `您的訊息`, value: message, inline: false },
                            { name: `${BOTNICKNAME}的回應`, value: chatResponse, inline: false }
                        )
                        .setFooter({ text: `內容由 AI 進行回應，可能存在疏漏，請仔細甄別。` });
        
                    await interaction.editReply({ embeds: [embed] });
                    sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了指令：/與${BOTNICKNAME}諮詢 回應內容:${chatResponse}`, "INFO");
                    break;
                }

                case '管理操作': {
                    //啟用延遲回覆
                    await interaction.deferReply({ ephemeral: true});

                    const operation = interaction.options.getString('操作');
                    sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了指令：/與${BOTNICKNAME}諮詢 管理操作:${operation}`, "INFO");

                    switch (operation) {
                        // 匯出聊天紀錄
                        case 'export': {
                            const filePath = exportChatHistory(userId);
                            const file = new AttachmentBuilder(filePath, { name: `NewIslandChat_${userId}.json` });
                            
                            infoReply(interaction, '**已匯出您的聊天歷史紀錄！**', [file]);
                            break;
                        }
                        
                        // 刪除聊天記錄
                        case 'delete': {
                            deleteChatHistory(userId);
                            infoReply(interaction, '**已刪除您的聊天歷史紀錄！**');
                            break;
                        }

                        // 創建聊天按鈕
                        case 'create_button': {
                            //執行權限驗證
                            checkAdmin();

                            const botUser = interaction.client.user;
                            const botAvatar = botUser.displayAvatarURL({ format: 'png', dynamic: true, size: 64 });
                            
                            const button = new ButtonBuilder()
                                .setCustomId('openChatButton')
                                .setLabel(`與${BOTNICKNAME}諮詢`)
                                .setStyle(ButtonStyle.Primary);

                            const row = new ActionRowBuilder().addComponents(button);
                            const embed = new EmbedBuilder()
                                .setColor(EMBED_COLOR)
                                .setTitle(`${EMBED_EMOJI} ┃ 與${BOTNICKNAME}諮詢`)
                                .setThumbnail(botAvatar)
                                .setDescription(INTRODUCE);

                            await interaction.channel.send({
                                embeds: [embed],
                                components: [row],
                                ephemeral: false
                            }),

                            //提示已發送按鈕
                            infoReply(interaction, '**已發送按鈕！**');
                            break;
                        }
                    }
            break;
            }
        }

        } catch (error) {
            // 錯誤處理
            sendLog(interaction.client, `❌ 在執行 /與${BOTNICKNAME}諮詢 指令時發生錯誤：`, "ERROR", error); // 記錄錯誤日誌
            errorReply(interaction, `**無法完成操作，原因：${error.message || '未知錯誤'}**`); // 向用戶顯示錯誤訊息
        }
    }
};

// 處理 Modal 提交的函式
module.exports.modalSubmit = async (interaction) => {
    if (interaction.customId === 'chatModal') {
  
        try {

            // 取得用戶輸入
            const message = interaction.fields.getTextInputValue('message');
            const userId = interaction.user.id;

            sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了互動：o與${BOTNICKNAME}諮詢 傳送訊息:${message}`, "INFO");

            // 顯示等待提示
            await interaction.deferReply({ ephemeral: true });
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setTitle(`${EMBED_EMOJI} ┃ 與${BOTNICKNAME}諮詢`)
                        .setDescription(`正在努力思考 ${EMBED_EMOJI_LOADING}`)
                ],
                ephemeral: true
            });
    
            // 取得 AI 回應
            const chatResponse = await chatWithOpenAI(userId, message);
    
            // 顯示 AI 回應
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setTitle(`${EMBED_EMOJI} ┃ 與${BOTNICKNAME}諮詢`)
                        .addFields(
                            { name: `您的訊息`, value: message },
                            { name: `${BOTNICKNAME}的回應`, value: chatResponse }
                        )
                        .setFooter({ text: `內容由 AI 進行回應，可能存在疏漏，請仔細甄別。` })
                ],
                ephemeral: true
            });
            sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了互動：o與${BOTNICKNAME}諮詢 回應內容:${chatResponse}`, "INFO");
    
        } catch (error) {
            // 錯誤處理
            await interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.embed.color.error)
                        .setDescription(`${EMBED_EMOJI_ERROR} **互動失敗：**伺服器繁忙，請稍後再試！`)
                ],
                ephemeral: true
            });
            sendLog(interaction.client, `❌ 在執行 o與${BOTNICKNAME}諮詢 互動時發生錯誤：${error.message}`, "ERROR");
        }
    }
};