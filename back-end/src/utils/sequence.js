import { dbConnect } from "../config/database.js";

export async function getNextSequence(collectionName, dbName = "website") {
    const db = await dbConnect(dbName);
    const counters = db.collection("counters");

    const result = await counters.findOneAndUpdate(
        { _id: collectionName },
        { $inc: { seq: 1 } },
        {
            upsert: true,
            returnDocument: "after",
            returnNewDocument: true,
            writeConcern: { w: "majority" }
        }
    );

    if (result?.value?.seq) {
        return result.value.seq;
    }

    if (result?.lastErrorObject?.updatedExisting === false) {
        await counters.updateOne(
            { _id: collectionName },
            { $set: { seq: 1 } }
        );
        return 1;
    }

    const doc = await counters.findOne({ _id: collectionName });
    if (doc?.seq) return doc.seq;

    await counters.updateOne(
        { _id: collectionName },
        { $set: { seq: 1 } },
        { upsert: true }
    );

    return 1;
}
