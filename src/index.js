'use strict';

const CV = module.exports = {};


// Returns a confusion matrix
CV.leaveOneOut = function (Classifier, features, labels, classifierOptions) {
    if (features.length !== labels.length) {
        throw new Error('features and labels should have the same length');
    }
    const distinct = getDistinct(labels);

    const confusionMatrix = new Array(distinct.length).fill(0).map(() => new Array(distinct.length).fill(0));
    var correct = 0;
    const len = features.length;
    for (let i = 0; i < len; i++) {

        var trainFeatures = features.slice(0,i).concat(features.slice(i+1, len));
        var trainLabels = labels.slice(0,i).concat(labels.slice(i+1, len));
        var testFeatures = features.slice(i,i+1);
        var testLabels = labels.slice(i, i+1);

        var classifier = new Classifier(classifierOptions);
        classifier.train(trainFeatures, trainLabels);
        var predictedLabels = classifier.predict(testFeatures);
        if(testLabels[0] === predictedLabels[0]) {
            correct++;
        }
        confusionMatrix[distinct.indexOf(testLabels[0])][distinct.indexOf(predictedLabels[0])]++;

    }

    return {
        confusionMatrix,
        accuracy: correct / len,
        labels: distinct
    };
};

function getDistinct(arr) {
    var s = new Set();
    for(let i=0; i<arr.length; i++) {
        s.add(arr[i]);
    }
    return Array.from(s);
}