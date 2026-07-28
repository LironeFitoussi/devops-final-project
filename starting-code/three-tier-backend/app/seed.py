from app.models import Post

SEED_POSTS = [
    dict(
        title="Choosing Your First Chisel Set",
        author="Mara Holt",
        excerpt="A beginner's guide to picking chisels that will last a lifetime, not a project.",
        content=(
            "Walk into any hardware store and you'll find chisel sets ranging from "
            "ten dollars to two hundred. For your first set, buy fewer chisels of "
            "better steel rather than a twelve-piece set of soft ones. A 1/4\", "
            "1/2\", and 3/4\" bevel-edge chisel in high-carbon or A2 steel will "
            "carry you through most joinery work: dovetails, mortises, and general "
            "paring. Keep them sharp — a dull chisel is more dangerous than a "
            "sharp one, since it needs more force and is more likely to slip."
        ),
    ),
    dict(
        title="Hand Plane Basics: Setting the Blade",
        author="Theo Ransome",
        excerpt="Getting a hand plane to cut a whisper-thin shaving starts with the blade, not the wood.",
        content=(
            "Most beginners blame the wood when a hand plane chatters or digs in. "
            "Nine times out of ten it's the blade setup. Start with the frog "
            "square to the sole, back off the depth adjuster until the blade "
            "barely protrudes, then advance it a hair at a time while sighting "
            "down the sole. You're aiming for a shaving so thin it's translucent. "
            "Once you can take that shaving consistently across the width of the "
            "blade, the rest of hand planing is just practice."
        ),
    ),
    dict(
        title="Router Table Safety Tips",
        author="Priya Nakamura",
        excerpt="Five habits that keep fingers attached and router bits from becoming projectiles.",
        content=(
            "A router table spins a bit at 20,000+ RPM a few inches from your "
            "hands, so a handful of habits matter more than any single jig: "
            "always use a push block for anything under 12 inches, feed against "
            "the bit's rotation, never start a cut with the fence open on both "
            "sides, unplug before changing bits, and keep the bit guard down even "
            "when it feels like it's in the way. None of this is exciting advice, "
            "but exciting router table stories are usually about the ones who "
            "skipped it."
        ),
    ),
    dict(
        title="Best Wood Glues for Joinery",
        author="Mara Holt",
        excerpt="PVA, epoxy, or hide glue — the right choice depends on the joint, not the label.",
        content=(
            "Yellow PVA (aliphatic resin) glue is the workhorse for most joinery: "
            "strong, fast-setting, and easy to clean up. Epoxy earns its place "
            "for gap-filling and outdoor work where water resistance matters. "
            "Hide glue is the odd one out — reversible with heat and moisture, "
            "which makes it the traditional choice for furniture you might need "
            "to repair someday. For a first shop, one bottle of PVA covers 90% "
            "of what you'll build."
        ),
    ),
    dict(
        title="Sharpening Stones 101",
        author="Theo Ransome",
        excerpt="Water stones, oil stones, or diamond plates: what actually matters is the grit progression.",
        content=(
            "The stone material matters less than people think; the grit "
            "progression matters a lot. A practical starting progression is "
            "1000/4000/8000 grit water stones, or a coarse/fine diamond plate "
            "plus a leather strop. Flatten your stones regularly — a dished "
            "stone will round over your edges without you noticing. And always "
            "sharpen to a burr before moving to the next grit; if you can't feel "
            "a burr on the back of the blade, you haven't finished that stone yet."
        ),
    ),
]


def seed_if_empty(session) -> None:
    if session.query(Post).count() > 0:
        return
    session.add_all(Post(**data) for data in SEED_POSTS)
    session.commit()
