import React, {useState} from 'react';
import {Treebeard} from 'react-treebeard';
import * as AWS from "aws-sdk";

function TreeView() {
    function getCurrUserFiles(userFileDetails, currUser) {
        return userFileDetails.filter(userFileDetail => userFileDetail.userID === currUser)
            .map(userFileDetail => userFileDetail.filePathList)
    }

    function constructTreeViewDataRecur(path, userFileDetails, currIndex) {
        if (currIndex >= path.length) {
            return null;
        }
        const currUser = path[currIndex];
        const currUserFiles = getCurrUserFiles(userFileDetails, currUser)[0];
        let children = [];
        currUserFiles.forEach(file => {
            let currChild = {name: file, children: []};
            children.push(currChild);
        });
        const childNode = constructTreeViewDataRecur(path, userFileDetails, currIndex + 1);
        if (childNode !== null) {
            children.push(childNode);
        }
        let currNode = {
            name: currUser,
            children: children
        };
        return currNode;
    }

    function prepareData(pathsFromRoot, userFileDetails) {
        let treeViewList = []
        pathsFromRoot.forEach(path => {
            const treeViewData = constructTreeViewDataRecur(path, userFileDetails, 0)
            treeViewList.push(treeViewData);
        })
        return treeViewList;
    }

    const getPathFromAdmin = (event) => {
        if (userID === '' || transactionID === '') {
            alert('user id & transaction id must be provided');
            return;
        }

        const lambdaClient = new AWS.Lambda({
            region: process.env.REACT_APP_REGION,
            secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
            accessKeyId: process.env.REACT_APP_ACCESS_ID
        });
        const apiRequestBody = {
            transactionID: transactionID,
            userID: userID
        };
        const params = {
            FunctionName: 'FileStructureGetPathFromRoot',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({
                body: JSON.stringify(apiRequestBody)
            })
        };
        lambdaClient.invoke(params, function(err, obj){
            if (err) {
                console.error(err);
            } else {
                let userIDs = []
                const pathsFromRoot = JSON.parse(JSON.parse(obj.Payload).body);
                pathsFromRoot.forEach(path => path.forEach(user => userIDs.push(user)));
                const uniqueUserIDs = [...new Set(userIDs)];
                const getFilesForUsersParams = {
                    FunctionName: 'GetFilesForUsers',
                    InvocationType: 'RequestResponse',
                    Payload: JSON.stringify({
                        body: JSON.stringify({
                            transactionID: transactionID,
                            userIDList: uniqueUserIDs
                        })
                    })
                }
                lambdaClient.invoke(getFilesForUsersParams, function(err, obj){
                    if (err) {
                        console.error(err);
                    } else {
                        const userFileDetails = JSON.parse(JSON.parse(obj.Payload).body);
                        let dataNow = prepareData(pathsFromRoot, userFileDetails);
                        setMyDataArray(oldArray => dataNow);
                    }
                });
            }
        });
    }

    const [data, setData] = useState({name: 'root', children: []});
    const [dataArray, setMyDataArray] = useState([{name: 'root', children: []}]);
    const [cursor, setCursor] = useState(false);
    const [userID, setUserID] = useState('');
    const [transactionID, setTransactionID] = useState('')

    const onToggle = (node, toggled) => {
        if (cursor) {
            cursor.active = false;
        }
        node.active = true;
        if (node.children) {
            node.toggled = toggled;
        }
        setCursor(node);
        setData(Object.assign({}, data))
    }

    let treeViewRenderList = []
    dataArray.forEach((dataCurr,index)=>{
        treeViewRenderList.push( <Treebeard data={dataCurr} onToggle={onToggle}/>)
    })

    return (
        <>
            <label>
                <b>User ID:   </b>
                <input
                    value={userID}
                    onChange={event => setUserID(event.target.value)}
                    name="userID"
                    type="text"
                />
            </label>
            <br/>
            <label>
                <b>Transaction ID:   </b>
                <input
                    value={transactionID}
                    onChange={event => setTransactionID(event.target.value)}
                    name="transactionID"
                    type="text"
                />
            </label>
            <br/><br/>
            <button type='submit' onClick={getPathFromAdmin}>Get Path from Admin</button>
            <br/><br/><br/><br/><br/>
            {treeViewRenderList}
        </>
    )
}
export default TreeView;