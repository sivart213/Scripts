/**
 * Remove existing "/open" tag and add "/open" to all currently open reader tabs.
 * Works in Zotero Actions Tags plugin.
 * @author Jacob
 * @link https://github.com/windingwind/zotero-actions-tags
 */

const Zotero_Tabs = require("Zotero_Tabs");

const OPEN_TAG = '/open';
const RECENT_TAG = '/recent';

// 1️⃣ Get all open reader tabs
let open_tabs = Zotero_Tabs._tabs.filter(tab =>
    ['reader', 'reader-unloaded'].includes(tab.type)
);
let openIDs = open_tabs.map(tab => tab.data.itemID);

// 2️⃣ Find all items currently tagged "/open" or "/recent"
let s = new Zotero.Search();
s.libraryID = Zotero.Libraries.userLibraryID;
s.addCondition('joinMode', 'any');
s.addCondition('tag', 'is', OPEN_TAG);
s.addCondition('tag', 'is', RECENT_TAG);

let taggedIDs = await s.search();

let openZotIDs = new Set();

// 3️⃣ Process tagged items
await Zotero.DB.executeTransaction(async function () {
    for (let id of openIDs) {
        let zotItem = await Zotero.Items.getAsync(id);
        if (!zotItem) continue;

        // If attachment/note, work on parent
        if (zotItem.isAttachment() || zotItem.isNote()) {
            let parent = Zotero.Items.getTopLevel([zotItem])[0];
            if (parent) zotItem = parent;
        }
        openZotIDs.add(zotItem.id);
        let changed = false;
        if (!zotItem.hasTag(OPEN_TAG)) {
            zotItem.addTag(OPEN_TAG, 0); // 0 = manual tag
            changed = true;
        }
        if (!zotItem.hasTag(RECENT_TAG)) {
            zotItem.addTag(RECENT_TAG, 0); // 0 = manual tag
            changed = true;
        }
        if (changed) await zotItem.save();
    }

    for (let id of taggedIDs) {
        let zotItem = await Zotero.Items.getAsync(id);
        if (!zotItem) continue;
        
        // remove "/open" and "/recent" tags from unopened items
        let changed = false;
        if (!openZotIDs.has(id)) {
            if (zotItem.hasTag(OPEN_TAG)) {
                zotItem.removeTag(OPEN_TAG);
                changed = true;
            }
            if (zotItem.hasTag(RECENT_TAG)) {
                zotItem.removeTag(RECENT_TAG);
                changed = true;
            }
        }
        if (changed) await zotItem.save();
    }
});

//return `Synced /open tag: ${openIDs.length} open, ${taggedIDs.length} previously tagged`;
