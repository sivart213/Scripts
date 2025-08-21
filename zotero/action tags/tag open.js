/**
 * Called on open tag. Clears open and ensures only open tabs get open. Adds recent tag to open tabs.
 * Works in Zotero Actions Tags plugin.
 * @author Jacob
 * @link https://github.com/windingwind/zotero-actions-tags
 */

const Zotero_Tabs = require("Zotero_Tabs");

const OPEN_TAG = '/open';
const RECENT_TAG = '/recent';
const UNREAD_TAG = '/unread';

// 1️⃣ Get all open reader tabs
let open_tabs = Zotero_Tabs._tabs.filter(tab =>
    ['reader', 'reader-unloaded'].includes(tab.type)
);
let openIDs = open_tabs.map(tab => tab.data.itemID);

// 2️⃣ Find all items currently tagged "/open"
let s = new Zotero.Search();
s.libraryID = Zotero.Libraries.userLibraryID;
s.addCondition('tag', 'is', OPEN_TAG);

let taggedIDs = await s.search();

// 3️⃣ Process tagged items
await Zotero.DB.executeTransaction(async function () {
    for (let id of taggedIDs) {
        let zotItem = await Zotero.Items.getAsync(id);
        if (!zotItem) continue;
        
        // remove "/open" tags
        zotItem.removeTag(OPEN_TAG);
        await zotItem.save();
    }

    for (let id of openIDs) {
        let zotItem = await Zotero.Items.getAsync(id);
        if (!zotItem) continue;

        // If attachment/note, work on parent
        if (zotItem.isAttachment() || zotItem.isNote()) {
            let parent = Zotero.Items.getTopLevel([zotItem])[0];
            if (parent) zotItem = parent;
        }
        zotItem.addTag(OPEN_TAG, 0);
        
        if (!zotItem.hasTag(RECENT_TAG)) {
            zotItem.addTag(RECENT_TAG, 0);
        }
        if (zotItem.hasTag(UNREAD_TAG)) {
            zotItem.removeTag(UNREAD_TAG);
        }

        await zotItem.save();
    }
});

//return `Synced /open tag: ${openIDs.length} open, ${taggedIDs.length} previously tagged`;
