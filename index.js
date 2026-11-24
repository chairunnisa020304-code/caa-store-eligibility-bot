
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const GROUP_ID = "806440852";
const MINIMUM_DAYS = 14;

const commands = [
  new SlashCommandBuilder()
    .setName("cek")
    .setDescription("Cek kelayakan Roblox Group Payout")
    .addStringOption(option =>
      option
        .setName("username")
        .setDescription("Username Roblox kamu")
        .setRequired(true)
    )
];

client.once("ready", async () => {
  console.log(`Bot aktif sebagai ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN
  );

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands.map(command => command.toJSON()) }
  );

  console.log("Slash command berhasil didaftarkan!");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "cek") return;

  await interaction.deferReply();

  const username = interaction.options.getString("username");

  try {
    const userResponse = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      }
    );

    const userData = await userResponse.json();

    if (!userData.data || userData.data.length === 0) {
      return interaction.editReply("❌ Username Roblox tidak ditemukan.");
    }

    const robloxUser = userData.data[0];

    const memberResponse = await fetch(
      `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships?maxPageSize=100`,
      {
        headers: {
          "x-api-key": process.env.ROBLOX_API_KEY
        }
      }
    );

    if (!memberResponse.ok) {
      throw new Error("Roblox API tidak dapat diakses.");
    }

    const memberData = await memberResponse.json();

    const membership = (memberData.groupMemberships || []).find(
      member =>
        member.user &&
        member.user.split("/").pop() === String(robloxUser.id)
    );

    if (!membership) {
      return interaction.editReply(
        "❌ Kamu belum terdeteksi sebagai anggota Caelia Community."
      );
    }

    const joinedAt = new Date(membership.createTime);
    const days = Math.floor(
      (Date.now() - joinedAt.getTime()) / 86400000
    );

    const eligible = days >= MINIMUM_DAYS;

    const embed = new EmbedBuilder()
      .setColor(eligible ? 0x2ecc71 : 0xe74c3c)
      .setTitle("CAА STORE | ELIGIBILITY CHECK")
      .addFields(
        { name: "Username", value: robloxUser.name, inline: true },
        { name: "Roblox ID", value: String(robloxUser.id), inline: true },
        { name: "Membership", value: `${days} hari`, inline: true },
        { name: "Minimum", value: "14 hari", inline: true },
        {
          name: "Status",
          value: eligible ? "✅ ELIGIBLE" : "❌ NOT ELIGIBLE"
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error(error);
    await interaction.editReply(
      "⚠️ Terjadi kesalahan saat mengecek akun. Silakan coba lagi nanti."
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
