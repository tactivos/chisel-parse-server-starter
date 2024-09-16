const PLAYBOOK_SITE_NAME_ID = 'u_JrDY7Xj6Kz__Playbooks';
const PLAYBOOK_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`;
const PHASE_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Phase`
const SESSION_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Session`
const CATEGORY_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Category`
const TEAM_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Team`
const ACTIVITY_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Activity`
const AUTHOR_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____Author`
const FAQ_PAGE_MODEL_NAME = `ct____${PLAYBOOK_SITE_NAME_ID}____FAQ_Page`

const PLAYBOOK_TRANSFORM_FIELDS = ['Author', 'Phases', 'Category', 'Teams'];
const PHASE_TRANSFORM_FIELDS = ['Sessions'];
const SESSION_TRANSFORM_FIELDS = ['Live_Activities', 'Post_Activities', 'Pre_Work_Activities'];

const getSiteNameId = async (siteId) => {
  const siteQuery = new Parse.Query('Site');
  siteQuery.equalTo('objectId', siteId);
  const siteRecord = await siteQuery.first({ useMasterKey: true });
  if (!siteRecord || !siteRecord.get('nameId')) return null;
  return siteRecord.get('nameId');
};

const getModelFromTableName = async(tableName) => {
  const modelQuery = new Parse.Query('Model');
  modelQuery.equalTo('tableName', tableName);
  const modelRecord = await modelQuery.first({ useMasterKey: true });
  return modelRecord;
}

const updateDraftObject = async (modelName, ownerObject, data) => {
  let draftObject = null;
  let draftQuery = new Parse.Query(modelName);
  draftQuery.equalTo('t__owner', ownerObject);
  try {
    draftObject = await draftQuery.first({ useMasterKey: true });
  } catch(error) {
    console.error('Error in updateDraftObject / find draft Object', error);
  }

  try {
    if (draftObject) await draftObject.save(data, { useMasterKey: true });
  } catch(error) {
    console.error('Error in updateDraftObject / update draft object', error);
  }
}

const removeDraftObject = async(MODEL_NAME, ownerObject) => {
  try {
    const draftQuery = new Parse.Query(MODEL_NAME);
    draftQuery.equalTo('t__owner', ownerObject);
    const draftObject = await draftQuery.first({ useMasterKey: true });
    if (draftObject) draftObject.destroy({ useMasterKey: true });
  } catch(error) {
    console.error(`Error while removing draft object of ${MODEL_NAME}`, error);
    throw error;
  }
}

const createMediaItemFromFile = async(fileRecord) => {
  // eslint-disable-next-line no-undef
  const siteQuery = new Parse.Query('Site');
  const siteObject = await siteQuery.first({ useMasterKey: true });
  // eslint-disable-next-line no-undef
  const MediaItemModel = Parse.Object.extend('MediaItem');
  const newMediaItemObject = new MediaItemModel();
  newMediaItemObject.set('site', siteObject);
  newMediaItemObject.set('assigned', true);
  newMediaItemObject.set('type', fileRecord._type);
  newMediaItemObject.set('size', fileRecord._size);
  newMediaItemObject.set('file', fileRecord);
  newMediaItemObject.set('name', fileRecord._name);
  await newMediaItemObject.save();
  return newMediaItemObject;
}

const getMarkedColorValue = (asciiCode) => {
  // number that contains 3 times ASCII value of character -- unique for every alphabet
  const colorNum =
    asciiCode.toString() + asciiCode.toString() + asciiCode.toString();

  var num = Math.round(0xffffff * parseInt(colorNum));
  return num & 255;
};

function generateParticipantColor(id, name) {
  // get first alphabet in upper case
  const nameAlphabet = name.charAt(0).charCodeAt(0);
  const idFirstAlphabet = id.charAt(0).charCodeAt(0);
  const idLastAlphabet = id.charAt(id.length - 1).charCodeAt(0);

  var r = getMarkedColorValue(nameAlphabet);
  var g = getMarkedColorValue(idFirstAlphabet);
  var b = getMarkedColorValue(idLastAlphabet);

  return 'rgb(' + r + ', ' + g + ', ' + b + ', 0.9)';
}
function getUserDetail(userObject) {
  if (!userObject) return null;
  const id = userObject.id;
  const name = userObject.get('name') || '';
  const color = generateParticipantColor(id, name);
  let avatarFile = null;

  if (userObject.get('avatarFile')) {
    if (userObject.get('avatarFile').get('file')) {
      avatarFile = userObject.get('avatarFile').get('file')
        ? userObject.get('avatarFile').get('file')._url
        : null;
    }
  }

  return {
    id,
    name,
    color,
    avatarURL: userObject.get('avatarURL') || avatarFile
  };
}

function getActivityObjectDetail(activityObject) {
  if (!activityObject) return null;
  let facilitators = [];
  if (
    activityObject.get('facilitator') &&
    Array.isArray(activityObject.get('facilitator'))
  ) {
    facilitators = activityObject.get('facilitator').map(getUserDetail);
  }
  return {
    id: activityObject.id,
    title: activityObject.get('title') || '',
    url: activityObject.get('URL') || '',
    roundLabels: activityObject.get('roundLabels'),
    discussionTimeLimit: activityObject.get('discussionTimeLimit'),
    orderingTimeLimit: activityObject.get('orderingTimeLimit'),
    quadrantLabels: activityObject.get('quadrantLabels'),
    quadrantDescription: activityObject.get('quadrantDescription'),
    facilitators
  };
}

const updateActivityObject = async (siteNameId, activityId, activityObject) => {
  try {
    const {
      orderingTimeLimit,
      discussionTimeLimit,
      roundLabels,
      quadrantLabels,
      quadrantDescription
    } = activityObject;
    const activityQuery = new Parse.Query(`ct____${siteNameId}____Activity`);
    activityQuery.equalTo('objectId', activityId);
    const activityRecord = await activityQuery.first();

    if (!activityRecord) return false;

    if (discussionTimeLimit)
      activityRecord.set('discussionTimeLimit', discussionTimeLimit);
    if (orderingTimeLimit)
      activityRecord.set('orderingTimeLimit', orderingTimeLimit);
    if (roundLabels) activityRecord.set('roundLabels', roundLabels);
    if (quadrantLabels) activityRecord.set('quadrantLabels', quadrantLabels);
    if (quadrantDescription)
      activityRecord.set('quadrantDescription', quadrantDescription);

    await activityRecord.save();
    return true;
  } catch (error) {
    console.log('Error in udpateActivityObject', error);
    return false;
  }
};

function getActivityItemDetail(activityItemObject) {
  if (!activityItemObject) return null;
  let activityObject = null;
  if (
    activityItemObject.get('activity') &&
    activityItemObject.get('activity')[0]
  ) {
    activityObject = getActivityObjectDetail(
      activityItemObject.get('activity')[0]
    );
  }
  return {
    id: activityItemObject.id,
    label: activityItemObject.get('label') || '',
    activityObject,
    order: activityItemObject.get('systemOrder') || 0,
    firstRanking: activityItemObject.get('firstRanking') || 0,
    secondRanking: activityItemObject.get('secondRanking') || 0
  };
}

function getUserInputDetail(userInputObject) {
  if (!userInputObject) return null;
  const item =
    userInputObject.get('item') && userInputObject.get('item')[0]
      ? getActivityItemDetail(userInputObject.get('item')[0])
      : null;
  const activity =
    userInputObject.get('activity') && userInputObject.get('activity')[0]
      ? getActivityObjectDetail(userInputObject.get('activity')[0])
      : null;
  const user =
    userInputObject.get('user') && userInputObject.get('user')[0]
      ? getUserDetail(userInputObject.get('user')[0])
      : null;
  return {
    id: userInputObject.id,
    item,
    activity,
    user,
    round: userInputObject.get('round') || '',
    ranking: userInputObject.get('ranking') || 0
  };
}

const validateActivityPassCode = async (siteNameId, url, passCode) => {
  try {
    const activityQuery = new Parse.Query(`ct____${siteNameId}____Activity`);
    // activityQuery.equalTo('URL', url);
    activityQuery.equalTo('t__status', 'Published');
    activityQuery.equalTo('passCode', passCode);
    const activityRecord = await activityQuery.first();

    if (!activityRecord) return false;
    return activityRecord;
  } catch (error) {
    console.log('Error in validateActivityPassCode', error);
    return false;
  }
};

const getUserRoleForActivity = async (
  siteNameId,
  userObject,
  activityObject
) => {
  try {
    if (!activityObject || !activityObject.id) return 'facilitator';

    const activityQuery = new Parse.Query(`ct____${siteNameId}____Activity`);

    activityQuery.equalTo('objectId', activityObject.id);
    activityQuery.equalTo('facilitator', userObject);
    const activityRecord = await activityQuery.first();

    if (activityRecord) return 'facilitator';
  } catch (error) {
    console.log('Error in getUserRoleForActivity', error);
  }
  return 'participant';
};

const fetchItemsForActivity = async (siteNameId, activityObjectId) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;
    const activityItemQuery = new Parse.Query(
      `ct____${siteNameId}____ActivityItems`
    );
    activityItemQuery.equalTo('activity', activityObject);

    const activityItemRecords = await activityItemQuery.find();

    const activityItems = activityItemRecords
      .map(getActivityItemDetail)
      .sort((a, b) => (Number(a.order) > Number(b.order) ? 1 : -1));

    return activityItems;
  } catch (error) {
    console.log('inside fetchItemsForActivity', error);
    return [];
  }
};

const getUserInputForActivityByUserId = async (
  siteNameId,
  activityObjectId,
  userId,
  round
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);
    const userObject = new UserModel();
    userObject.id = userId;

    const userInputQuery = new Parse.Query(`ct____${siteNameId}____UserInput`);
    userInputQuery.equalTo('activity', activityObject);
    userInputQuery.equalTo('user', userObject);
    userInputQuery.equalTo('round', round);
    userInputQuery.include(['activity']);
    userInputQuery.include(['item']);
    userInputQuery.include(['user']);

    const userInputRecords = await userInputQuery.find();

    const userInputs = userInputRecords
      .map(getUserInputDetail)
      .sort((a, b) => (Number(a.ranking) > Number(b.ranking) ? 1 : -1));

    return userInputs;
  } catch (error) {
    console.log('inside getUserInputForActivityByUserId', error);
    return [];
  }
};

const fetchUserInputForActivity = async (
  siteNameId,
  activityObjectId,
  round
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const userInputQuery = new Parse.Query(`ct____${siteNameId}____UserInput`);
    userInputQuery.equalTo('activity', activityObject);
    userInputQuery.equalTo('round', round);
    userInputQuery.include(['user']);
    userInputQuery.include(['user.avatarFile']);
    userInputQuery.include(['item']);

    const userInputRecords = await userInputQuery.find({ useMasterKey: true });

    const userInputs = userInputRecords.map(getUserInputDetail);

    const results = userInputs.reduce((acc, userInput) => {
      const userId = userInput.user.id;
      const userName = userInput.user.name;
      const avatarURL = userInput.user.avatarURL || '';
      const color = generateParticipantColor(userId, userName);
      let record = { userName, list: [], avatarURL, color };

      const data = {
        id: userInput.id,
        ranking: userInput.ranking,
        itemId: userInput.item.id,
        order: userInput.item.order,
        label: userInput.item.label
      };
      if (Object.keys(acc).indexOf(userId) !== -1) record = acc[userId];

      let list = [...record.list, data];
      list = list.sort((a, b) => (a.order > b.order ? 1 : -1));
      return { ...acc, [userId]: { ...record, list } };
    }, {});

    return results;
  } catch (error) {
    console.log('inside fetchUserInputForActivity', error);
    return [];
  }
};

const createUserInputForActivity = async (
  siteNameId,
  activityObjectId,
  userId,
  round
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const UserInputModel = Parse.Object.extend(
      `ct____${siteNameId}____UserInput`
    );
    const ActivityItemModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityItems`
    );
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const userObject = new UserModel();
    userObject.id = userId;
    const items = await fetchItemsForActivity(siteNameId, activityObjectId);

    const userInputItems = items.map((item) => {
      const activityItemObject = new ActivityItemModel();
      activityItemObject.id = item.id;
      const userInputObject = new UserInputModel();
      userInputObject.set('activity', [activityObject]);
      userInputObject.set('user', [userObject]);
      userInputObject.set('item', [activityItemObject]);
      userInputObject.set('ranking', item.order);
      userInputObject.set('round', round);
      return userInputObject;
    });

    await Parse.Object.saveAll(userInputItems);

    const userInputs = await getUserInputForActivityByUserId(
      siteNameId,
      activityObjectId,
      userId,
      round
    );

    return userInputs;
  } catch (error) {
    console.log('inside createUserInputForActivity', error);
    return [];
  }
};

const removeDuplicateUserInputItems = async (
  siteNameId,
  activityObjectId,
  userId,
  round
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const userObject = new UserModel();
    userObject.id = userId;

    const userInputQuery = new Parse.Query(`ct____${siteNameId}____UserInput`);
    userInputQuery.equalTo('activity', activityObject);
    userInputQuery.equalTo('user', userObject);
    userInputQuery.equalTo('round', round);
    userInputQuery.include(['item']);
    const userInputRecords = await userInputQuery.find();

    const itemsMap = {};
    const recordsToRemove = [];
    userInputRecords.forEach((record) => {
      if (record.get('item') && record.get('item')[0]) {
        const activityItemId = record.get('item')[0].id;
        if (activityItemId && itemsMap[activityItemId]) {
          recordsToRemove.push(record);
        } else {
          itemsMap[activityItemId] = record.id;
        }
      }
    });
    if (recordsToRemove.length > 0) {
      await Parse.Object.destroyAll(recordsToRemove, { useMasterKey: true });
    }

    const userInputs = await getUserInputForActivityByUserId(
      siteNameId,
      activityObjectId,
      userId,
      round
    );

    return userInputs;
  } catch (error) {
    console.log('inside removeDuplicateUserInputItems', error);
    return null;
  }
};

const updateUserInputsRanking = async (siteNameId, rankingMap) => {
  try {
    const ids = Object.keys(rankingMap);

    const userInputQuery = new Parse.Query(`ct____${siteNameId}____UserInput`);
    userInputQuery.containedIn('objectId', ids);

    const userInputRecords = await userInputQuery.find();
    const results = userInputRecords.map((record) => {
      const order = rankingMap[record.id];
      record.set('ranking', order);
      return record;
    });

    await Parse.Object.saveAll(results, {
      useMasterKey: true
    });
  } catch (error) {
    console.log('inside updateUserInputsRanking', error);
    return [];
  }
};

const createAction = async (
  siteNameId,
  kind,
  activityObjectId,
  actionByUserId,
  itemId,
  participantId,
  data
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const ActionModel = Parse.Object.extend(`ct____${siteNameId}____Action`);
    const ActivityItemModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityItems`
    );
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const actionByUserObject = new UserModel();
    actionByUserObject.id = actionByUserId;

    const participantUserObject = new UserModel();
    participantUserObject.id = participantId;

    const activityItemObject = new ActivityItemModel();
    activityItemObject.id = itemId;

    const actionObject = new ActionModel();
    actionObject.set('kind', kind);
    actionObject.set('activity', [activityObject]);
    actionObject.set('actionBy', [actionByUserObject]);
    if (participantId) actionObject.set('participant', [participantUserObject]);
    if (itemId) actionObject.set('item', [activityItemObject]);
    if (data) actionObject.set('data', data);
    await actionObject.save();
    return actionObject;
  } catch (error) {
    console.log('inside createAction', error);
    return [];
  }
};

const removeOldAction = async (
  siteNameId,
  kind,
  activityObjectId,
  actionByUserId
) => {
  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const ActionModel = Parse.Object.extend(`ct____${siteNameId}____Action`);
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;
    const actionByUserObject = new UserModel();
    actionByUserObject.id = actionByUserId;

    const actionQuery = new Parse.Query(ActionModel);
    actionQuery.equalTo('kind', kind);
    actionQuery.equalTo('activity', activityObject);
    actionQuery.equalTo('actionBy', actionByUserObject);
    const actionObjects = await actionQuery.find();

    await Parse.Object.destroyAll(actionObjects, { useMasterKey: true });
  } catch (error) {
    console.log('inside removeOldAction', error);
  }
};

const addUserToActivityDynamicData = async (
  siteNameId,
  activityObjectId,
  participantUserId
) => {
  try {
    const ActivityDynamicDataModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityDynamicData`
    );
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;
    const userObject = new UserModel();
    userObject.id = participantUserId;

    const activityDynamicDataQuery = new Parse.Query(ActivityDynamicDataModel);
    activityDynamicDataQuery.equalTo('activity', activityObject);

    let activityDynamicDataModelObject = await activityDynamicDataQuery.first();

    if (!!activityDynamicDataModelObject) {
      const usersObjects = activityDynamicDataModelObject.get('users');
      const userObjectIndex = usersObjects.findIndex(
        (obj) => obj.id === participantUserId
      );
      if (userObjectIndex === -1) {
        // update users properties for unrecognized user
        activityDynamicDataModelObject.set('users', [
          ...usersObjects,
          userObject
        ]);
        await activityDynamicDataModelObject.save();
      }
    } else {
      // Create a new participant model object case
      activityDynamicDataModelObject = new ActivityDynamicDataModel();
      activityDynamicDataModelObject.set(
        'slug',
        `${activityObjectId}_dynamicData`
      );
      activityDynamicDataModelObject.set('t__status', 'Published');
      activityDynamicDataModelObject.set('activity', [activityObject]);
      activityDynamicDataModelObject.set('users', [userObject]);
      activityDynamicDataModelObject.set('status', 'WAITING');
      activityDynamicDataModelObject.set('round', 1);
      await activityDynamicDataModelObject.save();
    }

    return activityDynamicDataModelObject;
  } catch (error) {
    console.log('Error inside addUserToActivityDynamicData', error);
    return null;
  }
};

const removeUserFromActivityDynamicData = async (
  siteNameId,
  activityObjectId,
  participantUserId
) => {
  try {
    const ActivityDynamicDataModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityDynamicData`
    );
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;
    const userObject = new UserModel();
    userObject.id = participantUserId;

    const activityDynamicDataQuery = new Parse.Query(ActivityDynamicDataModel);
    activityDynamicDataQuery.equalTo('activity', activityObject);

    const activityDynamicDataModelObject = await activityDynamicDataQuery.first();

    if (!!activityDynamicDataModelObject) {
      const usersObjects = activityDynamicDataModelObject.get('users');
      const filteredUsersObjects = usersObjects.filter(
        (obj) => obj.id !== participantUserId
      );
      // update users properties for unrecognized user
      activityDynamicDataModelObject.set('users', filteredUsersObjects);
      await activityDynamicDataModelObject.save();
    }
    return activityDynamicDataModelObject;
  } catch (error) {
    console.log('Error inside removeUserFromActivityDynamicData', error);
    return null;
  }
};

const updateIndividualParticipantStatus = async (
  siteNameId,
  activityObjectId,
  participantUserId,
  newStatus
) => {
  try {
    const ActivityDynamicDataModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityDynamicData`
    );
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const activityDynamicDataQuery = new Parse.Query(ActivityDynamicDataModel);
    activityDynamicDataQuery.equalTo('activity', activityObject);

    const activityDynamicDataModelObject = await activityDynamicDataQuery.first();

    if (!!activityDynamicDataModelObject) {
      let participantStatus = activityDynamicDataModelObject.get(
        'participantStatus'
      )
        ? JSON.parse(
            activityDynamicDataModelObject.get('participantStatus').toString()
          )
        : {};
      participantStatus[participantUserId] = newStatus;
      // update users properties for unrecognized user
      activityDynamicDataModelObject.set(
        'participantStatus',
        JSON.stringify(participantStatus)
      );
      await activityDynamicDataModelObject.save();
    }
    return activityDynamicDataModelObject;
  } catch (error) {
    console.log('Error inside updateIndividualParticipantStatus', error);
    return null;
  }
};

const getActivityDynamicData = async (siteNameId, activityObjectId) => {
  try {
    const ActivityDynamicDataModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityDynamicData`
    );
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const activityDynamicDataQuery = new Parse.Query(ActivityDynamicDataModel);
    activityDynamicDataQuery.equalTo('activity', activityObject);
    activityDynamicDataQuery.equalTo('t__status', 'Published');
    activityDynamicDataQuery.include(['users']);
    activityDynamicDataQuery.include(['users.avatarFile']);
    const activityDynamicDataModelObject = await activityDynamicDataQuery.first(
      { useMasterKey: true }
    );

    if (
      !activityDynamicDataModelObject ||
      !activityDynamicDataModelObject.get('users')
    ) {
      return [];
    }

    const participants = activityDynamicDataModelObject
      .get('users')
      .map(getUserDetail);

    return {
      participants,
      status: activityDynamicDataModelObject.get('status'),
      round: activityDynamicDataModelObject.get('round'),
      participantStatus: activityDynamicDataModelObject.get(
        'participantStatus'
      ),
      firstRoundStartTime: activityDynamicDataModelObject.get(
        'firstRoundStartTime'
      ),
      secondRoundStartTime: activityDynamicDataModelObject.get(
        'secondRoundStartTime'
      ),
      discussionStartTime: activityDynamicDataModelObject.get(
        'discussionStartTime'
      ),
      controlParticipantId: activityDynamicDataModelObject.get(
        'controlParticipantId'
      )
    };
  } catch (error) {
    console.log('Error inside getActivityDynamicData', error);
    return null;
  }
};

const updateActivityDynamicData = async (
  siteNameId,
  activityObjectId,
  data
) => {
  const {
    status,
    round,
    participantStatus,
    firstRoundStartTime,
    secondRoundStartTime,
    discussionStartTime,
    controlParticipantId
  } = data;
  try {
    const ActivityDynamicDataModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityDynamicData`
    );
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );

    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const activityDynamicDataQuery = new Parse.Query(ActivityDynamicDataModel);
    activityDynamicDataQuery.equalTo('activity', activityObject);
    const activityDynamicDataModelObject = await activityDynamicDataQuery.first();

    if (activityDynamicDataModelObject) {
      if (status) activityDynamicDataModelObject.set('status', status);
      if (round) activityDynamicDataModelObject.set('round', round);
      if (participantStatus)
        activityDynamicDataModelObject.set(
          'participantStatus',
          JSON.stringify(participantStatus)
        );
      if (firstRoundStartTime)
        activityDynamicDataModelObject.set(
          'firstRoundStartTime',
          firstRoundStartTime
        );
      if (secondRoundStartTime)
        activityDynamicDataModelObject.set(
          'secondRoundStartTime',
          secondRoundStartTime
        );
      if (discussionStartTime)
        activityDynamicDataModelObject.set(
          'discussionStartTime',
          discussionStartTime
        );
      if (controlParticipantId)
        activityDynamicDataModelObject.set(
          'controlParticipantId',
          controlParticipantId
        );
      await activityDynamicDataModelObject.save();
      return activityDynamicDataModelObject;
    }
    return null;
  } catch (error) {
    console.log('Error inside updateActivityDynamicData', error);
    return null;
  }
};

const getActionDetail = async (siteNameId, actionId) => {
  try {
    const actionQuery = new Parse.Query(`ct____${siteNameId}____Action`);
    actionQuery.equalTo('objectId', actionId);

    const actionObject = await actionQuery.first();

    if (actionObject) {
      const actionById =
        actionObject.get('actionBy') && actionObject.get('actionBy')[0]
          ? actionObject.get('actionBy')[0].id
          : null;
      const itemId =
        actionObject.get('item') && actionObject.get('item')[0]
          ? actionObject.get('item')[0].id
          : null;
      const participantId =
        actionObject.get('participant') && actionObject.get('participant')[0]
          ? actionObject.get('participant')[0].id
          : null;
      const data = actionObject.get('data');
      return {
        kind: actionObject.get('kind'),
        actionById,
        participantId,
        itemId,
        data
      };
    }
  } catch (error) {
    console.log('Error inside getActionDetail', error);
  }
  return null;
};

const updateActivityItemsWithRanking = async (
  siteNameId,
  activityItemsMap,
  fieldName
) => {
  try {
    const ids = Object.keys(activityItemsMap);

    const activityItemQuery = new Parse.Query(
      `ct____${siteNameId}____ActivityItems`
    );
    activityItemQuery.containedIn('objectId', ids);

    const activityItemRecords = await activityItemQuery.find();
    const results = activityItemRecords.map((record) => {
      record.set(fieldName, activityItemsMap[record.id]);
      return record;
    });

    await Parse.Object.saveAll(results, {
      useMasterKey: true
    });
  } catch (error) {
    console.log('Error inside updateActivityItemsWithRanking', error);
  }
  return null;
};

Parse.Cloud.define('getSiteNameId', async (request) => {
  try {
    const { siteId } = request.params;
    // get site name Id and generate MODEL names based on that
    const siteNameId = await getSiteNameId(siteId);
    if (siteNameId === null) {
      throw { message: 'Invalid siteId' };
    }
    return { status: 'success', siteNameId };
  } catch (error) {
    console.log('Error in getSiteNameId cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('updateActivityObject', async (request) => {
  try {
    const { siteId, activityId, activityObject } = request.params;
    // get site name Id and generate MODEL names based on that
    const siteNameId = await getSiteNameId(siteId);
    if (siteNameId === null) {
      throw { message: 'Invalid siteId' };
    }
    const isUpdated = await updateActivityObject(
      siteNameId,
      activityId,
      activityObject
    );

    return { status: 'success', isUpdated };
  } catch (error) {
    console.log('Error in updateActivityObject cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('createNewUser', async (request) => {
  try {
    const { siteId, avatarURL, username, name, roomCode, url } = request.params;
    // get site name Id and generate MODEL names based on that
    const siteNameId = await getSiteNameId(siteId);
    if (siteNameId === null) {
      throw { message: 'Invalid siteId' };
    }

    const isPassCodeValid = await validateActivityPassCode(
      siteNameId,
      url,
      roomCode
    );
    if (!isPassCodeValid) {
      return { status: 'failure', message: 'Invalid Pass Code' };
    }
    const activityObject = isPassCodeValid;

    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);
    const newUser = new UserModel();
    newUser.set('username', username);
    newUser.set('name', name);
    newUser.set('avatarURL', avatarURL);
    newUser.set('t__status', 'Published');
    await newUser.save();

    const role = await getUserRoleForActivity(
      siteNameId,
      newUser,
      activityObject
    );
    const userDetail = getUserDetail(newUser);
    const activityDetail = getActivityObjectDetail(activityObject);
    return { status: 'success', userDetail, role, activityDetail };
  } catch (error) {
    console.log('Error in createNewUser cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('login', async (request) => {
  try {
    const { siteId, username, roomCode, url } = request.params;
    // get site name Id and generate MODEL names based on that
    const siteNameId = await getSiteNameId(siteId);
    if (siteNameId === null) {
      throw { message: 'Invalid siteId' };
    }

    const isPassCodeValid = await validateActivityPassCode(
      siteNameId,
      url,
      roomCode
    );

    if (!isPassCodeValid) {
      return { status: 'failure', message: 'Invalid Pass Code' };
    }
    const activityObject = isPassCodeValid;

    const UserModel = Parse.Object.extend(`ct____${siteNameId}____User`);
    const userQuery = new Parse.Query(UserModel);
    userQuery.equalTo('username', username);
    userQuery.include('avatarFile');
    const userObject = await userQuery.first({ useMasterKey: true });

    if (!userObject) {
      return { status: 'failure', message: 'Invalid username' };
    }

    const role = await getUserRoleForActivity(
      siteNameId,
      userObject,
      activityObject
    );
    const userDetail = getUserDetail(userObject);
    const activityDetail = getActivityObjectDetail(activityObject);

    const activityItems = await fetchItemsForActivity(
      siteNameId,
      activityObject.id
    );

    if (activityItems.length < 1 && role !== 'facilitator') {
      return { status: 'fail', message: 'Actvity is not ready yet.' };
    }

    await updateIndividualParticipantStatus(
      siteNameId,
      activityObject.id,
      userObject.id,
      'ONLINE'
    );
    return { status: 'success', userDetail, role, activityDetail, siteNameId };
  } catch (error) {
    console.log('Error in login cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('addItem', async (request) => {
  const { siteId, itemText, activityObjectId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const ActivityItemModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityItems`
    );
    const activityItemObject = new ActivityItemModel();
    activityItemObject.set('label', itemText);
    activityItemObject.set('activity', [activityObject]);
    await activityItemObject.save();

    const activityItemDetail = getActivityItemDetail(activityItemObject);
    return { status: 'success', activityItemDetail };
  } catch (error) {
    console.log('Error in addItem cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('addItems', async (request) => {
  const { siteId, items, activityObjectId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const activityObject = new ActivityModel();
    activityObject.id = activityObjectId;

    const ActivityItemModel = Parse.Object.extend(
      `ct____${siteNameId}____ActivityItems`
    );

    const activityItemObjects = items.map((item) => {
      const activityItemObject = new ActivityItemModel();
      activityItemObject.set('label', item);
      activityItemObject.set('activity', [activityObject]);
      return activityItemObject;
    });

    const addedItems = await Parse.Object.saveAll(activityItemObjects, {
      useMasterKey: true
    });
    const addedTtemsDetails = addedItems.map(getActivityItemDetail);
    return { status: 'success', items: addedTtemsDetails };
  } catch (error) {
    console.log('Error in addItems cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('removeItem', async (request) => {
  const { siteId, activityItemId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    const activityItemQuery = new Parse.Query(
      `ct____${siteNameId}____ActivityItems`
    );
    activityItemQuery.equalTo('objectId', activityItemId);
    const activityItems = await activityItemQuery.find();
    if (activityItems && activityItems[0]) {
      await activityItems[0].destroy({ useMasterKey: true });
      return { status: 'success' };
    }
    return { status: 'failure-no-data-found' };
  } catch (error) {
    console.log('Error in removeItem cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('fetchItemsForActivity', async (request) => {
  const { siteId, activityObjectId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    const activityItems = await fetchItemsForActivity(
      siteNameId,
      activityObjectId
    );

    return { status: 'success', activityItems };
  } catch (error) {
    console.log('Error in fetchItemsForActivity cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('updateItemsOrder', async (request) => {
  const { siteId, orderMap, activityId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    const ActivityModel = Parse.Object.extend(
      `ct____${siteNameId}____Activity`
    );
    const activity = new ActivityModel();
    activity.id = activityId;

    const activityItemQuery = new Parse.Query(
      `ct____${siteNameId}____ActivityItems`
    );
    activityItemQuery.equalTo('activity', activity);

    const activityItemRecords = await activityItemQuery.find();

    let results = [];
    const keys = Object.keys(orderMap);
    results = activityItemRecords.filter(
      (record) => keys.indexOf(record.id) !== -1
    );
    results = results.map((record) => {
      const order = orderMap[record.id];
      record.set('systemOrder', order);
      return record;
    });

    const updatedActivityItemObjects = await Parse.Object.saveAll(results, {
      useMasterKey: true
    });

    const activityItems = updatedActivityItemObjects
      .map(getActivityItemDetail)
      .sort((a, b) => (Number(a.order) > Number(b.order) ? 1 : -1));

    return { status: 'success', activityItems };
  } catch (error) {
    console.log('Error in updateItemsOrder cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('fetchUserInputForActivity', async (request) => {
  const { siteId, activityObjectId, userId, round } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    let userInputItems = await getUserInputForActivityByUserId(
      siteNameId,
      activityObjectId,
      userId,
      round
    );
    if (userInputItems && userInputItems.length < 1) {
      userInputItems = await createUserInputForActivity(
        siteNameId,
        activityObjectId,
        userId,
        round
      );
    }

    return { status: 'success', userInputItems };
  } catch (error) {
    console.log('Error in getUserInputForActivityByUserId cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('removeDuplicateUserInputItems', async (request) => {
  const { siteId, activityObjectId, userId, round } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    let userInputItems = await removeDuplicateUserInputItems(
      siteNameId,
      activityObjectId,
      userId,
      round
    );

    return { status: 'success', userInputItems };
  } catch (error) {
    console.log('Error in removeDuplicateUserInputItems cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('updateUserInputsRanking', async (request) => {
  const {
    siteId,
    rankingMap,
    activityObjectId,
    userId,
    round
  } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    await updateUserInputsRanking(siteNameId, rankingMap);

    const userInputItems = await getUserInputForActivityByUserId(
      siteNameId,
      activityObjectId,
      userId,
      round
    );

    return { status: 'success', userInputItems };
  } catch (error) {
    console.log('Error in updateUserInputsRanking cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('getAllUserInputsRankingForActivity', async (request) => {
  const { siteId, activityObjectId, round } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }

  try {
    let userInputItems = await fetchUserInputForActivity(
      siteNameId,
      activityObjectId,
      round
    );

    return { status: 'success', userInputItems };
  } catch (error) {
    console.log(
      'Error in getAllUserInputsRankingForActivity cloud code',
      error
    );
    return { status: 'error', error };
  }
});

Parse.Cloud.define('createAction', async (request) => {
  const {
    siteId,
    activityObjectId,
    kind,
    actionByUserId,
    itemId,
    participantId,
    data
  } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const actionObject = await createAction(
      siteNameId,
      kind,
      activityObjectId,
      actionByUserId,
      itemId,
      participantId,
      data
    );
    return { status: 'success', actionObject };
  } catch (error) {
    console.log('Error in createAction cloud code', error);
    return { status: 'error', error };
  }
});

// Add participant to actvity only when no such participant record exist
Parse.Cloud.define('addUserToActivityDynamicData', async (request) => {
  const { siteId, activityObjectId, userId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const activityDynamicDataModelObject = await addUserToActivityDynamicData(
      siteNameId,
      activityObjectId,
      userId
    );
    if (!activityDynamicDataModelObject) {
      return {
        status: 'failure',
        error: 'Failed to add user to participant list.'
      };
    }

    await removeOldAction(siteNameId, 'login', activityObjectId, userId);

    const actionObject = await createAction(
      siteNameId,
      'login',
      activityObjectId,
      userId
    );
    return { status: 'success', activityDynamicDataModelObject, actionObject };
  } catch (error) {
    console.log('Error in addUserToActivityDynamicData cloud code', error);
    return { status: 'error', error };
  }
});

// Called from subscription layer to get activity dynamic data
Parse.Cloud.define('getActivityDynamicData', async (request) => {
  const { siteId, activityObjectId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const data = await getActivityDynamicData(siteNameId, activityObjectId);
    return { status: 'success', data };
  } catch (error) {
    console.log('Error in getActivityDynamicData cloud code', error);
    return { status: 'error', error };
  }
});

// Called from subscription layer to the participant list for activity
Parse.Cloud.define('updateActivityDynamicData', async (request) => {
  const {
    siteId,
    activityObjectId,
    status,
    round,
    participantStatus,
    firstRoundStartTime,
    secondRoundStartTime
  } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const data = {
      status,
      round,
      participantStatus,
      firstRoundStartTime,
      secondRoundStartTime
    };
    const activityDynamicDataModelObject = await updateActivityDynamicData(
      siteNameId,
      activityObjectId,
      data
    );
    return { status: 'success', activityDynamicDataModelObject };
  } catch (error) {
    console.log('Error in updateActivityDynamicData cloud code', error);
    return { status: 'error', error };
  }
});

// Called from home page to get activity dynamic data
Parse.Cloud.define('getActionDetail', async (request) => {
  const { siteId, actionId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const actionDetail = await getActionDetail(siteNameId, actionId);
    return { status: 'success', actionDetail };
  } catch (error) {
    console.log('Error in getActionDetail cloud code', error);
    return { status: 'error', error };
  }
});

// Add participant to actvity only when no such participant record exist
Parse.Cloud.define('removeUserFromActivityDynamicData', async (request) => {
  const { siteId, activityObjectId, userId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const activityDynamicDataModelObject = await removeUserFromActivityDynamicData(
      siteNameId,
      activityObjectId,
      userId
    );
    console.log('participant model object', activityDynamicDataModelObject);
    if (!activityDynamicDataModelObject) {
      return {
        status: 'failure',
        error: 'Failed to add user to participant list.'
      };
    }

    await removeOldAction(siteNameId, 'logout', activityObjectId, userId);

    const actionObject = await createAction(
      siteNameId,
      'logout',
      activityObjectId,
      userId
    );
    return { status: 'success', activityDynamicDataModelObject, actionObject };
  } catch (error) {
    console.log('Error in removeUserFromActivityDynamicData cloud code', error);
    return { status: 'error', error };
  }
});

// Add participant to actvity only when no such participant record exist
Parse.Cloud.define('logoutUser', async (request) => {
  const { siteId, activityObjectId, userId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const activityDynamicDataModelObject = await updateIndividualParticipantStatus(
      siteNameId,
      activityObjectId,
      userId,
      'OFFLINE'
    );
    if (!activityDynamicDataModelObject) {
      return {
        status: 'failure',
        error:
          'Failed to log the user out and update participant status of the activity.'
      };
    }

    await removeOldAction(siteNameId, 'logout', activityObjectId, userId);

    const actionObject = await createAction(
      siteNameId,
      'logout',
      activityObjectId,
      userId
    );
    return { status: 'success', activityDynamicDataModelObject, actionObject };
  } catch (error) {
    console.log('Error in logoutUser cloud code', error);
    return { status: 'error', error };
  }
});

// Allow Participant to speak, called from Graph component
// create action and update dynamic data
Parse.Cloud.define('allowParticipantToSpeak', async (request) => {
  const {
    siteId,
    activityObjectId,
    userId,
    itemId,
    participantId
  } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const actionObject = await createAction(
      siteNameId,
      'allowParticipantToSpeak',
      activityObjectId,
      userId,
      itemId,
      participantId
    );

    const activityDynamicDataModelObject = await updateActivityDynamicData(
      siteNameId,
      activityObjectId,
      { discussionStartTime: new Date() }
    );
    return { status: 'success', activityDynamicDataModelObject, actionObject };
  } catch (error) {
    console.log('Error in allowParticipantToSpeak cloud code', error);
    return { status: 'error', error };
  }
});

// Allow Participant to speak, called from Graph component
// create action and update dynamic data
Parse.Cloud.define('grantParticipantControl', async (request) => {
  const { siteId, activityObjectId, userId, participantId } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    const actionObject = await createAction(
      siteNameId,
      'grantControl',
      activityObjectId,
      userId,
      null,
      participantId
    );

    const activityDynamicDataModelObject = await updateActivityDynamicData(
      siteNameId,
      activityObjectId,
      {
        status: 'round-participant-control',
        controlParticipantId: participantId
      }
    );
    return { status: 'success', activityDynamicDataModelObject, actionObject };
  } catch (error) {
    console.log('Error in grantParticipantControl cloud code', error);
    return { status: 'error', error };
  }
});

// Allow Participant to speak, called from Graph component
// create action and update dynamic data
Parse.Cloud.define('updateActivityItemsWithRanking', async (request) => {
  const { siteId, activityItemsMap, fieldName } = request.params;
  // get site name Id and generate MODEL names based on that
  const siteNameId = await getSiteNameId(siteId);
  if (siteNameId === null) {
    throw { message: 'Invalid siteId' };
  }
  try {
    await updateActivityItemsWithRanking(
      siteNameId,
      activityItemsMap,
      fieldName
    );
    return { status: 'success' };
  } catch (error) {
    console.log('Error in updateActivityItemsWithRanking cloud code', error);
    return { status: 'error', error };
  }
});

Parse.Cloud.define('authorize', async (request) => {
  const authorizationUri =
    'https://app.mural.co/api/public/v1/authorization/oauth2/';
  try {
    const query = new URLSearchParams();
    query.set('client_id', process.env.MURAL_CLIENT_ID);
    // query.set('redirect_uri', process.env.MURAL_REDIRECT_URI);
    query.set('redirect_uri', 'https://priority-gm.getforge.io/callback');
    query.set('state', 123);
    query.set('response_type', 'code');
    const scopes = [
      'identity:read',
      'workspaces:read',
      'rooms:read',
      'rooms:write',
      'murals:read',
      'murals:write'
    ];
    query.set('scope', scopes.join(' '));
    return { success: true, url: `${authorizationUri}?${query}` };
  } catch (error) {
    console.error('inside authorize', error);
    return { success: false, error };
  }
});

Parse.Cloud.define('token', async (request) => {
  try {
    const { params } = request;
    const response = await axios.post(
      'https://app.mural.co/api/public/v1/authorization/oauth2/token',
      {
        client_id: process.env.MURAL_CLIENT_ID,
        // client_secret: process.env.MURAL_CLIENT_SECRET,
        client_secret:
          '42a86b661837058b7fb6327aeac2708ef57bb868b377e8370e804152e05508a324674b16a28934d5a4fe10eba3a593cdfa181347b5c46a6eacf89f5c29bb90ae',
        code: params.code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://priority-gm.getforge.io/callback'
        // redirect_uri: process.env.MURAL_REDIRECT_URI
      }
    );
    if (response.status !== 200) {
      throw 'token request failed';
    }
    return {
      success: true,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token
    };
  } catch (error) {
    console.error('token error', error);
    return { success: false, error };
  }
});

Parse.Cloud.define('getAllMurals', async (request) => {
  try {
    const { token } = request.params;
    const url = 'https://app.mural.co/api/public/v1/murals';
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getAllMurals', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('getAllWorkspaces', async (request) => {
  try {
    const { token } = request.params;
    const url = 'https://app.mural.co/api/public/v1/workspaces';
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getAllWorkspaces', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('getMuralsByRoom', async (request) => {
  try {
    const { token, roomId } = request.params;
    const url = `https://app.mural.co/api/public/v1/rooms/${roomId}/murals`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getMuralsByRoom', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('createMural', async (request) => {
  try {
    const { token, title, workspaceId, roomId } = request.params;
    const url = 'https://app.mural.co/api/public/v1/murals';
    const params = {
      title,
      workspaceId,
      roomId
    };
    const res = await axios.post(url, params, {
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        Accept: 'application/json'
      }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getAllWorkspaces', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('getAllRooms', async (request) => {
  try {
    const { token, workspaceId } = request.params;
    const url = `https://app.mural.co/api/public/v1/workspaces/${workspaceId}/rooms`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getAllRooms', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('getWorkspaceById', async (request) => {
  try {
    const { token, workspaceId } = request.params;
    const url = `https://app.mural.co/api/public/v1/workspaces/${workspaceId}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in getWorkspaceById', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('createStickies', async (request) => {
  try {
    const {
      token,
      title,
      text,
      muralId,
      x,
      y,
      width = 138,
      height = 138
    } = request.params;
    const url = `https://app.mural.co/api/public/v1/murals/${muralId}/widgets/sticky-note`;
    const params = {
      height,
      presentationIndex: -1,
      rotation: 0,
      style: {
        backgroundColor: '#FCFE7DFF',
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        font: 'proxima-nova',
        fontSize: 23,
        textAlign: 'center',
        border: false
      },
      width,
      shape: 'rectangle',
      text,
      title,
      x,
      y
    };
    const res = await axios.post(url, params, {
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      }
    });
    return { status: 'success', result: res.data };
  } catch (error) {
    console.log('error in createStickies', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error)
    };
  }
});

Parse.Cloud.define('createAxises', async (request) => {
  let params;
  try {
    const {
      token,
      muralId,
      xAxisTop,
      yAxisLeft,
      width,
      height
    } = request.params;
    const url = `https://app.mural.co/api/public/v1/murals/${muralId}/widgets/arrow`;
    params = {
      presentationIndex: -1,
      arrowType: 'straight',
      stackable: true,
      style: {
        strokeStyle: 'solid',
        strokeWidth: 1,
        strokeColor: '#D60057FF'
      },
      tip: 'no tip',
      points: [
        {
          x: 0,
          y: xAxisTop
        },
        {
          x: width,
          y: xAxisTop
        }
      ],
      width: 1,
      height: 1,
      x: 0,
      y: 0
    };
    await axios.post(url, params, {
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      }
    });

    params = {
      ...params,
      points: [{ x: yAxisLeft, y: 0 }, { x: yAxisLeft, y: height }]
    };

    await axios.post(url, params, {
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      }
    });

    return { status: 'success' };
  } catch (error) {
    console.log('error in createAxises', error);
    return {
      status: 'error',
      error: error.toString(),
      errorObject: JSON.stringify(error),
      params
    };
  }
});



// PROTOTYPE FOR PLAYBOOKS

Parse.Cloud.define("getPublishedPlaybooks", async (request) => {
  const query = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
  query.equalTo("t__status", "Published");
  query.notEqualTo("Marketplace_Type", "Premium");

  query.include("Category");
  query.include("Phases");
  query.include("Phases.Sessions");
  query.include("Phases.Sessions.Thumbnail");
  query.include("Phases.Sessions.Pre_Work_Activities");
  query.include("Phases.Sessions.Live_Activities");
  query.include("Phases.Sessions.Post_Activities");
  query.include("Icon");
  query.include("Teams");
  query.include("Author");
  query.include("Author.Logo");
  query.include("Background_Image");
  query.include("Experiments");

  query.ascending("Featured_Order");

  try {
      const results = await query.find({ useMasterKey: true });

    results.forEach(playbook => {
      if (playbook.get("Featured_Order") === null || playbook.get("Featured_Order") === undefined) {
        playbook.set("Featured_Order", Number.MAX_SAFE_INTEGER);
      }
    });
    results.sort((a, b) => a.get("Featured_Order") - b.get("Featured_Order"));

      return results.filter(playbook => {
          const companies = playbook.get('Published_For_Company').filter(value => !!value && value.length > 0);
          return companies.length === 0;
        })
        .map(playbook => playbook.toJSON());
  } catch (error) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Error fetching published playbooks: ${error.message}`);
  }
});

Parse.Cloud.define("getPremiumPlaybooks", async (request) => {
  const query = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
  query.equalTo("t__status", "Published");
  query.equalTo("Marketplace_Type", "Premium");

  query.include("Category");
  query.include("Phases");
  query.include("Phases.Sessions");
  query.include("Phases.Sessions.Thumbnail");
  query.include("Phases.Sessions.Pre_Work_Activities");
  query.include("Phases.Sessions.Live_Activities");
  query.include("Phases.Sessions.Post_Activities");
  query.include("Icon");
  query.include("Teams");
  query.include("Author");
  query.include("Author.Logo");
  query.include("Background_Image");
  query.include("Experiments");

  query.ascending("Featured_Order");

  try {
      const results = await query.find({ useMasterKey: true });

    results.forEach(playbook => {
      if (playbook.get("Featured_Order") === null || playbook.get("Featured_Order") === undefined) {
        playbook.set("Featured_Order", Number.MAX_SAFE_INTEGER);
      }
    });
    results.sort((a, b) => a.get("Featured_Order") - b.get("Featured_Order"));

      return results.filter(playbook => {
          const companies = playbook.get('Published_For_Company').filter(value => !!value && value.length > 0);
          return companies.length === 0;
        })
        .map(playbook => playbook.toJSON());
  } catch (error) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Error fetching premium published playbooks: ${error.message}`);
  }
});


Parse.Cloud.define("getPublishedPlaybooksForCompany", async (request) => {
  const { companyId } = request.params;
  const query = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
  if (companyId) {
    query.equalTo('Published_For_Company', companyId);
  }
  query.equalTo("t__status", "Published");
  query.include("Category");
  query.include("Phases");
  query.include("Phases.Sessions");
  query.include("Phases.Sessions.Thumbnail");
  query.include("Phases.Sessions.Pre_Work_Activities");
  query.include("Phases.Sessions.Live_Activities");
  query.include("Phases.Sessions.Post_Activities");
  query.include("Icon");
  query.include("Teams");
  query.include("Author");
  query.include("Author.Logo");
  query.include("Background_Image");

  try {
    const results = await query.find({ useMasterKey: true });
    return results.filter(playbook => {
      const companies = playbook.get('Published_For_Company').filter(value => !!value && value.length > 0);
      if (companyId) return companies.length > 0; else return companies.length === 0;
    })
    .map(playbook => playbook.toJSON());
  } catch (error) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Error fetching published playbooks: ${error.message}`);
  }
});

Parse.Cloud.define("getDraftPlaybooks", async (request) => {
  const { ownerId } = request.params;
  const query = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
  query.equalTo("t__status", "Draft");
  query.doesNotExist("t__owner");
  if (ownerId)
    query.equalTo("Owner_Id", ownerId);
  else {
    query.exists("Owner_Id");
    query.equalTo("Owner_Id", "");
  }

  query.include("Category");
  query.include("Phases");
  query.include("Phases.Sessions");
  query.include("Phases.Sessions.Thumbnail");
  query.include("Phases.Sessions.Pre_Work_Activities");
  query.include("Phases.Sessions.Live_Activities");
  query.include("Phases.Sessions.Post_Activities");
  query.include("Icon");
  query.include("Teams");
  query.include("Author");
  query.include("Author.Logo");
  query.include("Background_Image");

  try {
    const results = await query.find({ useMasterKey: true });
    return results.map(playbook => playbook.toJSON());
  } catch (error) {
    throw new Parse.Error(Parse.Error.SCRIPT_FAILED, `Error fetching draft playbooks: ${error.message}`);
  }
});

Parse.Cloud.define("getPlaybookBySlug", async (request) => {
  const { slug } = request.params;

  const query = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
  query.equalTo("Slug", slug);

  query.include("Category");
  query.include("Phases");
  query.include("Phases.Sessions");
  query.include("Phases.Sessions.Thumbnail");
  query.include("Phases.Sessions.Pre_Work_Activities");
  query.include("Phases.Sessions.Pre_Work_Activities.Service");
  query.include("Phases.Sessions.Pre_Work_Activities.Service.Icon");
  query.include("Phases.Sessions.Live_Activities");
  query.include("Phases.Sessions.Live_Activities.Service");
  query.include("Phases.Sessions.Live_Activities.Service.Icon");
  query.include("Phases.Sessions.Post_Activities");
  query.include("Phases.Sessions.Post_Activities.Service");
  query.include("Phases.Sessions.Post_Activities.Service.Icon");
  query.include("Icon");
  query.include("Workspace_Image");
  query.include("Teams");
  query.include("Author");
  query.include("Author.Logo");
  query.include("Background_Image");

  try {
    const playbook = await query.first({ useMasterKey: true });
    if (!playbook) {
    throw new Error('Playbook not found');
  }

  return playbook.toJSON();

  } catch (error) {
    throw new Parse.Error(400, 'Error fetching playbook: ' + error.message);
  }
});

Parse.Cloud.define("getSessionsForPlaybook", async (request) => {
  const playbookId = request.params.playbookId;

  try {
    const playbookQuery = new Parse.Query(`ct____${PLAYBOOK_SITE_NAME_ID}____Playbook`);
    playbookQuery.equalTo("objectId", playbookId);
    playbookQuery.include("Phases.Sessions");
    playbookQuery.include("Phases.Sessions.Thumbnail");
    playbookQuery.include("Phases.Sessions.Pre_Work_Activities");
    playbookQuery.include("Phases.Sessions.Live_Activities");
    playbookQuery.include("Phases.Sessions.Post_Activities");

    const playbook = await playbookQuery.first();

    if (!playbook) {
      throw new Error(`Playbook with ID ${playbookId} not found.`);
    }

    return playbook.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error fetching Playbook and Sessions: ${error.message}`
    );
  }
});


const buildDefaultTransformParams = (paramsList) => paramsList.reduce((acc, cur) => ({...acc, [cur]: []}), {});

const toModelObject = (id, modelName) => {
  const Model = Parse.Object.extend(modelName);
  const object = new Model();
  object.id = id;
  return object;
}

const toPhaseObject = (id) => toModelObject(id, PHASE_MODEL_NAME);
const toSessionObject = (id) => toModelObject(id, SESSION_MODEL_NAME);
const toActivityObject = (id) => toModelObject(id, ACTIVITY_MODEL_NAME);
const toAuthorObject = (id) => toModelObject(id, AUTHOR_MODEL_NAME);
const toCategoryObject = (id) => toModelObject(id, CATEGORY_MODEL_NAME);
const toTeamObject = (id) => toModelObject(id, TEAM_MODEL_NAME);


Parse.Cloud.define("createPlaybook", async (request) => {
  try {
    const playbook = await createPlaybok(request.params);
    return { status: 'success', result: playbook };
  } catch(error) {
    console.error('Error in createPlaybook', error);
    return { status: 'error', error: error.toString() };
  }
});

const buildPlaybookTransforms = (transforms) => {
  const result = {};

  if (transforms) {
    const { author, phases, teams, categories } = transforms;
    if (author) result['Author'] = author.map(toAuthorObject);
    if (phases) result['Phases'] = phases.map(toPhaseObject);
    if (categories) result['Category'] = categories.map(toCategoryObject);
    if (teams) result['Teams'] = teams.map(toTeamObject);
  }

  return result;
}


const createPlaybok = async (params) => {
  try {
    const { playbookParams, transforms }  = params;
    const PlaybookModel = Parse.Object.extend(PLAYBOOK_MODEL_NAME);

    // Prepare for model creation; model, categories etc
    const modelObject = await getModelFromTableName(PLAYBOOK_MODEL_NAME)

    const defaultTransformParams = buildDefaultTransformParams(PLAYBOOK_TRANSFORM_FIELDS);
    const transformParams = buildPlaybookTransforms(transforms);

    const playbookObject = new PlaybookModel();
    await playbookObject.save({
      Published_For_Company: [],
      ...playbookParams,
      ...defaultTransformParams,
      ...transformParams,
      t__model: modelObject,
      t__color: modelObject.get('color'),
      t__status: 'Draft'
    }, { useMasterKey: true });
    return playbookObject;
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error creating Playbook: ${error.message}`
    );
  }
};



Parse.Cloud.define("updatePlaybook", async (request) => {
  try {
    const phase = await updatePlaybook(request.params);
    return { status: 'success', result: phase };
  } catch(error) {
    console.error('Error in updatePlaybook', error);
    return { status: 'error', error: error.toString() };
  }
});


const updatePlaybook = async (data) => {
  try {
    const { objectId, params, transforms } = data;

    const query = new Parse.Query(PLAYBOOK_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const playbookObject = await query.first({ useMasterKey: true });

    if (playbookObject) {
      const transformParams = buildPlaybookTransforms(transforms)

      await playbookObject.save({...params, ...transformParams}, { useMasterKey: true });
    }
    return playbookObject.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error updating Playbook: ${error.message}`
    );
  }
};





Parse.Cloud.define("removePlaybook", async (request) => {
  try {
    const removedId = await removePlaybook(request.params.objectId);
    return { status: 'success', result: removedId };
  } catch(error) {
    console.error('Error in removePlaybook', error);
    return { status: 'error', error: error.toString() };
  }
});


const removePlaybook = async (objectId) => {
  try {
    const query = new Parse.Query(PLAYBOOK_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const playbookObject = await query.first({ useMasterKey: true });

    if (playbookObject) {
      // Remove Children = Phase
      if (playbookObject.get('Phases') && playbookObject.get('Phases').length > 0) {
        await Promise.all(playbookObject.get('Phases').map((phaseObject) => removePhase(phaseObject.id)));
      }

      await removeDraftObject(PLAYBOOK_MODEL_NAME, playbookObject)

      playbookObject.destroy({ useMasterKey: true });
      return objectId;
    }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error removing Playbook: ${error.message}`
    );
  }
};




const buildPhaseTransforms = (transforms) => {
  const result = {};

  if (transforms) {
    const { sessions } = transforms;
    if (sessions) result['Sessions'] = sessions.map(toSessionObject);
  }

  return result;
}

Parse.Cloud.define("createPhaseForPlaybook", async (request) => {
  try {
    const phase = await createPhaseForPlaybook(request.params);
    return { status: 'success', result: phase };
  } catch(error) {
    console.error('Error in createPhaseForPlaybook', error);
    return { status: 'error', error: error.toString() };
  }
});


const createPhaseForPlaybook = async (params) => {
  try {
    const { playbookId, playbookSlug, phaseParams }  = params;

    const PhaseModel = Parse.Object.extend(PHASE_MODEL_NAME);

    // Prepare for model creation; model, categories etc
    const modelObject = await getModelFromTableName(PHASE_MODEL_NAME)

    const defaultTransformParams = buildDefaultTransformParams(PHASE_TRANSFORM_FIELDS);

    const phaseObject = new PhaseModel();
    await phaseObject.save({
      ...phaseParams,
      ...defaultTransformParams,
      t__model: modelObject,
      t__color: modelObject.get('color'),
      t__status: 'Published'
    }, { useMasterKey: true });



    const query = new Parse.Query(PLAYBOOK_MODEL_NAME);
    if (playbookId) query.equalTo('objectId', playbookId);
    if (playbookSlug) query.equalTo('Slug', playbookSlug);
    const playbookObject = await query.first({ useMasterKey: true });

    if (playbookObject) {
      const phases = playbookObject.get('Phases') || [];
      await playbookObject.save({
        Phases: [...phases, phaseObject]
      }, { useMasterKey: true });
    }

    return phaseObject.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error creating Phase: ${error.message}`
    );
  }
};


Parse.Cloud.define("updatePhase", async (request) => {
  try {
    const phase = await updatePhase(request.params);
    return { status: 'success', result: phase };
  } catch(error) {
    console.error('Error in updatePhase', error);
    return { status: 'error', error: error.toString() };
  }
});


const updatePhase = async (data) => {
  try {
    const { objectId, params, transforms } = data;

    const query = new Parse.Query(PHASE_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const phaseObject = await query.first({ useMasterKey: true });

    if (phaseObject) {
      const transformParams = buildPhaseTransforms(transforms)
      const newData = {...params, ...transformParams};
      await phaseObject.save(newData, { useMasterKey: true });
      await updateDraftObject(PHASE_MODEL_NAME, phaseObject, newData);
    }
    return phaseObject.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error updating Phase: ${error.message}`
    );
  }
};



Parse.Cloud.define("removePhase", async (request) => {
  try {
    const removedId = await removePhase(request.params.objectId);
    return { status: 'success', result: removedId };
  } catch(error) {
    console.error('Error in removePhase', error);
    return { status: 'error', error: error.toString() };
  }
});


const removePhase = async (objectId) => {
  try {
    const query = new Parse.Query(PHASE_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const phaseObject = await query.first({ useMasterKey: true });

    if (phaseObject) {
      // Remove Children = Sessions
      if (phaseObject.get('Sessions') && phaseObject.get('Sessions').length > 0) {
        await Promise.all(phaseObject.get('Sessions').map((sessionObject) => removeSession(sessionObject.id)));
      }

      await removeDraftObject(PHASE_MODEL_NAME, phaseObject)
      phaseObject.destroy({ useMasterKey: true });
      return objectId;
    }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error removing Phase ${objectId}: ${error.message}`
    );
  }
};





Parse.Cloud.define("createSessionForPhase", async (request) => {
  try {
    const session = await createSessionForPhase(request.params);
    return { status: 'success', result: session };
  } catch(error) {
    console.error('Error in createSessionForPhase', error);
    return { status: 'error', error: error.toString() };
  }
});

const buildSessionTransforms = (transforms) => {
  const result = {};

  if (transforms) {
    const { liveActivities, postActivities, preWorkActivities } = transforms;

    if (liveActivities) result['Live_Activities'] = liveActivities.map(toActivityObject);
    if (postActivities) result['Post_Activities'] = postActivities.map(toActivityObject);
    if (preWorkActivities) result['Pre_Work_Activities'] = preWorkActivities.map(toActivityObject);
  }

  return result;
}

const createSessionForPhase = async (params) => {
  try {
    const { phaseId, sessionParams, transforms }  = params;

    const query = new Parse.Query(PHASE_MODEL_NAME);
    if (phaseId) query.equalTo('objectId', phaseId);
    const phaseObject = await query.first({ useMasterKey: true });

    if (phaseObject) {

      // Create a new session object
      const SessionModel = Parse.Object.extend(SESSION_MODEL_NAME);
      const modelObject = await getModelFromTableName(SESSION_MODEL_NAME)

      const defaultTransformParams = buildDefaultTransformParams(SESSION_TRANSFORM_FIELDS);
      const transformParams = buildSessionTransforms(transforms);

      const sessionObject = new SessionModel();
      await sessionObject.save({
        ...sessionParams,
        ...defaultTransformParams,
        ...transformParams,
        t__model: modelObject,
        t__color: modelObject.get('color'),
        t__status: 'Published'
      }, { useMasterKey: true });


      // Update phaseObject / Sessions property
      const sessions = phaseObject.get('Sessions') || [];
      await phaseObject.save({
        Sessions: [...sessions, sessionObject]
      }, { useMasterKey: true });

      return sessionObject.toJSON();
    }

  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error creating session: ${error.message}`
    );
  }
};


Parse.Cloud.define("updateSession", async (request) => {
  try {
    const phase = await updateSession(request.params);
    return { status: 'success', result: phase };
  } catch(error) {
    console.error('Error in updateSession', error);
    return { status: 'error', error: error.toString() };
  }
});


const updateSession = async (data) => {
  try {
    const { objectId, params, transforms } = data;

    const query = new Parse.Query(SESSION_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const sessionObject = await query.first({ useMasterKey: true });

    if (sessionObject) {
      const transformParams = buildSessionTransforms(transforms)

      await sessionObject.save({...params, ...transformParams}, { useMasterKey: true });
    }
    return sessionObject.toJSON();
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error updating Session: ${error.message}`
    );
  }
};


Parse.Cloud.define("removeSession", async (request) => {
  try {
    const removedId = await removeSession(request.params.objectId);
    return { status: 'success', result: removedId };
  } catch(error) {
    console.error('Error in removeSession', error);
    return { status: 'error', error: error.toString() };
  }
});


const removeSession = async (objectId) => {
  try {
    const query = new Parse.Query(SESSION_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const sessionObject = await query.first({ useMasterKey: true });

    if (sessionObject) {
      // Remove Children =
      for (const activityField of ['Live_Activities', 'Post_Activities', 'Pre_Work_Activities']) {
        if (sessionObject.get(activityField) && Array.isArray(sessionObject.get(activityField)) &&sessionObject.get(activityField).length > 0) {
          await Promise.all(sessionObject.get(activityField).map(async(activityObject) => removeActivity(activityObject.id)));
        }
      }

      await removeDraftObject(SESSION_MODEL_NAME, sessionObject)

      sessionObject.destroy({ useMasterKey: true });
      return objectId;
    }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error removing Session: ${error.message}`
    );
  }
};


const removeActivity = async (objectId) => {
  try {
    const query = new Parse.Query(ACTIVITY_MODEL_NAME);
    query.equalTo('objectId', objectId);
    const activityObject = await query.first({ useMasterKey: true });

    if (activityObject) {
      await removeDraftObject(ACTIVITY_MODEL_NAME, activityObject)

      activityObject.destroy({ useMasterKey: true });
      return objectId;
    }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error removing Activity: ${error.message}`
    );
  }
};


Parse.Cloud.define("getCategories", async () => {
  try {
    const query = new Parse.Query(CATEGORY_MODEL_NAME);
    query.equalTo("t__status", 'Published');
    const results = await query.find({ useMasterKey: true });
    return results.map(category => category.toJSON());
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error fetching categories: ${error.message}`
    );
  }
});


Parse.Cloud.define("getTeams", async () => {
  try {
    const query = new Parse.Query(TEAM_MODEL_NAME);
    query.equalTo("t__status", 'Published');
    const results = await query.find({ useMasterKey: true });
    return results.map(team => team.toJSON());
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error fetching teams: ${error.message}`
    );
  }
});


Parse.Cloud.define("getActivities", async () => {
  try {
    const query = new Parse.Query(ACTIVITY_MODEL_NAME);
    query.equalTo("t__status", 'Published');
    query.include(["Service"]);
    const results = await query.find({ useMasterKey: true });
    return results.map(activity => activity.toJSON());
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error fetching activites: ${error.message}`
    );
  }
});

Parse.Cloud.define("publishPlaybook", async (request) => {
  try {
    const publishedPlaybook = await publishPlaybook(request.params);
    return { status: 'success', result: publishedPlaybook }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error publishing playbooks: ${error.message}`
    );
  }
});



const publishPlaybook = async ({ playbookId }) => {
  let draftObject = null;

  // Get Draft Playbook from the given playbookId
  try {
    const query = new Parse.Query(PLAYBOOK_MODEL_NAME);
    query.equalTo('objectId', playbookId);
    draftObject = await query.first();
  } catch(error) {
    console.error('Error in publishPlaybook / getDraftObject', error);
    return null;
  }
  if (!draftObject) return null;

  // Check if the given playbookId object is already the main object
  try {
    const query = new Parse.Query(PLAYBOOK_MODEL_NAME);
    query.equalTo('t__owner', draftObject);
    const children = await query.find();
    if (children && children.length > 0) {
      await draftObject.save({
        't__status': 'Published'
      }, { useMasterKey: true });
      return draftObject.toJSON();
    }
  } catch(error) {
    console.error('Error in publishPlaybook / ifMainObject', error);
    return null;
  }

  // Prepare playbook published instance data from draft object.
  let data = {};
  for (var attr in draftObject.attributes) {
    if (draftObject.attributes.hasOwnProperty(attr) && attr !== 'objectId') {
      data[attr] = draftObject.get(attr);
    }
  }

  // Create Published Object
  const PlaybookModel = Parse.Object.extend(PLAYBOOK_MODEL_NAME);
  const publishedObject = new PlaybookModel();
  try {
    await publishedObject.save({
        ...data,
        't__status': 'Published'
      },
      { useMasterKey: true });
  } catch(error) {
    console.error('Error in publishPlaybook / savePublishedObject', error);
    return null;
  }

  if (!publishedObject) return null;
  // Update Draft Object, setting up newly created Published Object as owner
  try {
    await draftObject.save({
      't__owner': publishedObject
    },
    { useMasterKey: true });
  } catch(error) {
    console.error('Error in publishPlaybook / linkDraftObjectWithOwner', error);
    return null;
  }
  return publishedObject.toJSON();
}





Parse.Cloud.define("findOrCreateAuthor", async (request) => {
  try {
    const author = await findOrCreateAuthor(request.params);
    return { status: 'success', result: author }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error in findOrCreateAuthor CC: ${error.message}`
    );
  }
});


const findOrCreateAuthor = async ({ authorName, logo }) => {
  // get authorObject via Name
  let authorObject = null;
  try {
    const query = new Parse.Query(AUTHOR_MODEL_NAME);
    query.equalTo('Name', authorName);
    authorObject = await query.first();
  } catch(error) {
    console.error('Error in findOrCreateAuthor / getAuthorObject', error);
    return null;
  }

  // Build the data object to create / update Author
  const data = {
    'Name': authorName
  };
  try {
    if (logo) {
      const { fileName, base64 } = logo;
      // eslint-disable-next-line no-undef
      const parseFile = new Parse.File(fileName, { base64 });
      await parseFile.save({ useMasterKey: true });
      const logoMediaObject = await createMediaItemFromFile(parseFile);
      data['Logo'] = logoMediaObject;
    }
  } catch(error) {
    console.error('Error in findOrCreateAuthor / buildLoboMediaObject', error);
    return null;
  }

  const AuthorModel = Parse.Object.extend(AUTHOR_MODEL_NAME);
  try {
    if (!authorObject) authorObject = new AuthorModel();
    const modelObject = await getModelFromTableName(AUTHOR_MODEL_NAME)
    await authorObject.save({
      ...data,
      t__model: modelObject,
      t__color: modelObject.get('color'),
      't__status': 'Published'
    }, { useMasterKey: true });
    return authorObject.toJSON();
  } catch(error) {
    console.error('Error in findOrCreateAuthor / create/update Author', error);
    return null;
  }

}

Parse.Cloud.define("updateSessionThumbnail", async (request) => {
  try {
    const session = await updateSessionThumbnail(request.params);
    return { status: 'success', result: session }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error in updateSessionThumbnail CC: ${error.message}`
    );
  }
});


const updateSessionThumbnail = async ({ sessionId, thumbnail }) => {
  // get authorObject via Name
  let sessionObject = null;
  let draftObject = null;
  let data = {
    'Thumbnail': null
  };
  try {
    const query1 = new Parse.Query(SESSION_MODEL_NAME);
    query1.equalTo('objectId', sessionId);
    sessionObject = await query1.first();
  } catch(error) {
    console.error('Error in updateSessionThumbnail / getSessionObject', error);
    return null;
  }

  if (!sessionObject) return null;
  try {
    const query2 = new Parse.Query(SESSION_MODEL_NAME);
    query2.equalTo('t__owner', sessionObject);
    draftObject = await query2.first();
  } catch(error) {
    console.error('Error in updateSessionThumbnail / getDraftObject', error);
    return null;
  }

  if (!draftObject) return null;

  try {
    if (thumbnail) {
      const { fileName, base64 } = thumbnail;
      // eslint-disable-next-line no-undef
      const parseFile = new Parse.File(fileName, { base64 });
      await parseFile.save({ useMasterKey: true });
      const thumbnailMediaObject = await createMediaItemFromFile(parseFile);
      data['Thumbnail'] = thumbnailMediaObject;
    }
  } catch(error) {
    console.error('Error in updateSessionThumbnail / buildThumbnailMediaObject', error);
    return null;
  }

  try {
    await sessionObject.save(data, { useMasterKey: true });
    await draftObject.save(data, { useMasterKey: true });
    return sessionObject.toJSON();
  } catch(error) {
    console.error('Error in updateSessionThumbnail / updateSesison with thumbnail', error);
    return null;
  }

}


Parse.Cloud.define("getFAQPage", async () => {
  try {
    const page = await getFAQPage();
    return { status: 'success', result: page }
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.SCRIPT_FAILED,
      `Error in getFAQPage CC: ${error.message}`
    );
  }
});


const getFAQPage = async () => {
  try {
    const query = new Parse.Query(FAQ_PAGE_MODEL_NAME);
    query.include(['FAQ_Items'])
    const page = await query.first({ useMasterKey: true });
    return page.toJSON();
  } catch(error) {
    console.error('Error in getFAQPage', error);
    return null;
  }

}
