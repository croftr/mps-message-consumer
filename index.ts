import { getDivisionDetails, getMemeberVoting } from "./src/apicall";
import { setupNeo, createVotedForDivision, createDivisionNode } from "./src/neoManager";
import { MPMessage } from "./src/models/mps";
import { Division, DivisionDetails, DivisionMessage, MemberVoting } from "./src/models/divisions";
import { VotedFor } from "./src/models/relationships";
import { readDivisionMessage, readMpMessage } from "./src/messageManager";
import { getCategory } from "./src/utils/categoryManager";
import { exec } from "child_process";

const logger = require('./src/logger');

const endAndPrintTiming = (timingStart: number, timingName: string) => {
  // END timing
  let timingEnd = performance.now();
  logger.info(`<<TIMING>> ${timingName} in ${(timingEnd - timingStart) / 1000} seconds`);
}

const createRelationshipsFromVotes = async () => {

  let messages_in_queue = true;

  logger.info("start createRelationshipsFromVotes");

  await setupNeo();

  while (messages_in_queue) {

    const divisions: Array<DivisionMessage> = await readDivisionMessage();

    //for each vote from the message queue 
    for (let division of divisions) {

      //make api call to get division details and all votes on it
      const dvisionDetails: DivisionDetails = await getDivisionDetails(division.id);

      const divisionNode: Division = {
        DivisionId: dvisionDetails.division.DivisionId,
        Date: dvisionDetails.division.Date,
        PublicationUpdated: dvisionDetails.division.PublicationUpdated,
        Number: dvisionDetails.division.Number,
        IsDeferred: dvisionDetails.division.IsDeferred,
        EVELType: dvisionDetails.division.EVELType,
        EVELCountry: dvisionDetails.division.EVELCountry,
        Title: dvisionDetails.division.Title,
        AyeCount: dvisionDetails.division.AyeCount,
        NoCount: dvisionDetails.division.NoCount,
        category: getCategory(dvisionDetails.division.Title)
      }

      logger.info(`Creating dvision${dvisionDetails.division.Title}`)
      await createDivisionNode(divisionNode);


      logger.info(`Creating VOTED_FOR aye relationships`)
      for (let voter of dvisionDetails.ayes) {

        let vote: VotedFor = {
          mpId: voter.MemberId,
          divisionId: division.id,
          votedAye: true
        };

        await createVotedForDivision(vote);

      }
      logger.info(`Created ${dvisionDetails.ayes.length} VOTED_FOR aye relationships`)

      logger.info(`Creating VOTED_FOR no relationships`)
      for (let voter of dvisionDetails.noes) {

        let vote: VotedFor = {
          mpId: voter.MemberId,
          divisionId: division.id,
          votedAye: false
        };

        await createVotedForDivision(vote);
      }
      logger.info(`Created ${dvisionDetails.noes.length} VOTED_FOR no relationships`)

    }

    if (divisions.length === 0) {
      messages_in_queue = false;
    }
  }

  logger.info("The End")


}

const createRelationshipsFromMps = async () => {

  let messages_in_queue = true;

  logger.info("start createRelationshipsFromMps")

  // Start timing
  const totalTimeStart = performance.now();
  let timingStart = performance.now();

  await setupNeo();

  let skip = 0;

  //make relationships between mps and divisions
  let votesForMp: Array<VotedFor>;
  let index = 0;
  // @ts-ignore
  let votedAye = [];
  // @ts-ignore
  let votedNo = [];

  let MP_START_NUMBER = 0;

  // for (let i = MP_START_NUMBER; i < allMps.length; i++) {

  while (messages_in_queue) {

    // @ts-ignore
    const mps: Array<MPMessage> = await readMpMessage();

    if (mps.length === 0) {
      messages_in_queue = false;
    }

    for (let mp of mps) {

      const mpNumber = index + MP_START_NUMBER;

      logger.debug(`get relationships for mp [${mp.name}] ${mp.id}`);

      votesForMp = [];
      index += 1;
      let divisionsVotedCount = 25;
      let mpVoteCount = 0;
      while (divisionsVotedCount === 25) {

        let memeberVotings: Array<MemberVoting>;
        try {
          //for each mp get all the divisions they have voted on
          memeberVotings = await getMemeberVoting(skip, 25, mp.id);
        } catch (error) {
          logger.info("CHECK ME OUT DOING A RETRY!!!!!!!!!")
          //this sometimes fails for network issues so want to retry just once for now
          memeberVotings = await getMemeberVoting(skip, 25, mp.id);
        }

        skip += 25;

        //only create releationships for voted for divisions if we have created the division
        let filterVoteCount = 0;

        if (memeberVotings && Array.isArray(memeberVotings)) {

          memeberVotings.forEach(vote => {
            let votes = {
              mpId: mp.id,
              divisionId: vote.PublishedDivision.DivisionId,
              votedAye: vote.MemberVotedAye
            };

            votesForMp.push(votes);

            if (vote.MemberVotedAye) {
              votedAye.push(vote.PublishedDivision?.DivisionId);
            } else {
              votedNo.push(vote.PublishedDivision?.DivisionId);
            }


            filterVoteCount += 1;
          })

          divisionsVotedCount = memeberVotings.length;
        }

        mpVoteCount = mpVoteCount + filterVoteCount;

      }


      logger.debug(`creating ${votesForMp.length} Neo RELEATIONSHIPS for MP [${mp.name}] ${mp.id}`);
      for (let votedFor of votesForMp) {
        await createVotedForDivision(votedFor);
      }

      logger.debug(`created ${votesForMp.length} RELEATIONSHIPS for MP [${mp.name}] ${mp.id}`);
      skip = 0;
      mpVoteCount = 0;

    }

  }

  logger.info("The End")

}


const go = async () => {

  logger.info(`Running in mode ${process.env.MODE}`)

  try {
    if (process.env.MODE === "RECREATE_EVERYTHING") {
      logger.info("Attempting to recreate all mps and division relationships");
      createRelationshipsFromMps();
    } else {
      logger.info("Checking for new commons votes to add to database");
      createRelationshipsFromVotes();
    }
  } catch (error) {
    // @ts-ignore      
    logger.error(`An error has occured ${error.message}`);
    console.error("Error", error);

  } finally {
    exec('shutdown -h now', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing shutdown: ${error}`);
        return;
      }
      console.log(`Shutdown command executed successfully.`);
    });
  }
}

go()

