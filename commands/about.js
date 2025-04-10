const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config, configCommands } = require(path.join(process.cwd(), 'core/config'));
const { sendLog } = require(path.join(process.cwd(), 'core/sendLog'));
const { errorReply } = require(path.join(process.cwd(), 'core/Reply'));

// 導入設定檔內容
const EMBED_COLOR = config.embed.color.default;
const EMBED_EMOJI = configCommands.about.emoji;
const BOTNICKNAME = configCommands.about.botNickname;
const INTRODUCE = configCommands.about.introduce;
const PROVIDER = configCommands.about.provider;
const REPOSITORY = configCommands.about.repository;

module.exports = {
    data: new SlashCommandBuilder()
        .setName(`關於我`)
        .setDescription(`查詢${BOTNICKNAME}的相關資訊與介紹`),

    async execute(interaction) {

        //啟用延遲回覆
        await interaction.deferReply({ ephemeral: false });

        try {
            // 發送執行指令的摘要到 sendLog
            sendLog(interaction.client, `💾 ${interaction.user.tag} 執行了指令：/關於我`, "INFO");

            // 獲取機器人的相關資訊
            const botUser = interaction.client.user;
            const botUsername = botUser.username;
            const botAvatar = botUser.displayAvatarURL({ format: 'png', dynamic: true, size: 64 });
            const guilds = interaction.client.guilds.cache;

            // 獲取目前擁有的指令列表
            const commandCount = interaction.client.commands.size;
            const commands = interaction.client.commands.map(command => `\`${command.data.name}\``).join(' | ');

            // 計算所有伺服器的成員總數
            let totalMembers = 0;
            guilds.forEach(guild => {
                totalMembers += guild.memberCount;
            });

            // 格式化伺服器列表
            const guildList = guilds.map(guild => `- ${guild.name}`).join('\n');

            // 創建嵌入訊息
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle(`${EMBED_EMOJI} ┃ 關於${botUsername}`)
                .setThumbnail(botAvatar)
                .setDescription(INTRODUCE)
                .addFields(
                    { name: '服務提供者', value: `<@${PROVIDER}>`, inline: true },
                    { name: 'GitHub 儲存庫', value: `[前往 GitHub 儲存庫](${REPOSITORY})`, inline: true },
                    { name: `共有 ${commandCount} 條指令`, value: commands || '無', inline: false },
                    { name: `在 ${guilds.size.toString()} 個伺服器服務 ${totalMembers.toString()} 位成員`, value: guildList || '無', inline: false }
                );

                await interaction.editReply({ embeds: [embed], ephemeral: false });

        } catch (error) {
            // 錯誤處理
            sendLog(interaction.client, `❌ 在執行 /關於我 指令時發生錯誤`, "ERROR", error); // 記錄錯誤日誌
            errorReply(interaction, '**發生未預期的錯誤，請向開發者回報！**'); // 向用戶顯示錯誤訊息
        }
    }
};