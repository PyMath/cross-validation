'use strict';

const CV = {};
const combinations = require('ml-combinations');

/**
 * Performs a leave-one-out cross-validation (LOO-CV) of the given samples. In LOO-CV, 1 observation is used as the validation
 * set while the rest is used as the training set. This is repeated once for each observation. LOO-CV is a special case
 * of LPO-CV. @see leavePout
 * @param {constructor} Classifier - The classifier to use for the cross validation. Expect ml-classifier api.
 * @param {Array} features - The features for all samples of the data-set
 * @param {Array} labels - The classification class of all samples of the data-set
 * @param {Object} classifierOptions - The classifier options with which the classifier should be instantiated.
 * @returns {{confusionMatrix, accuracy: number, labels, nbPrediction: number}}
 */
CV.leaveOneOut = function (Classifier, features, labels, classifierOptions) {
    return CV.leavePOut(Classifier, features, labels, classifierOptions, 1);
};


/**
 * Performs a leave-p-out cross-validation (LPO-CV) of the given samples. In LPO-CV, p observations are used as the
 * validation set while the rest is used as the training set. This is repeated as many times as there are possible
 * ways to combine p observations from the set (unordered without replacement). Be aware that for relatively small
 * data-set size this can require a very large number of training and testing to do!
 * @param Classifier - The classifier to use for the cross validation. Expect ml-classifier api.
 * @param {Array} features - The features for all samples of the data-set
 * @param {Array} labels - The classification class of all samples of the data-set
 * @param {Object} classifierOptions - The classifier options with which the classifier should be instantiated.
 * @param {Number} p - The size of the validation sub-samples' set
 * @returns {{confusionMatrix, accuracy: number, labels, nbPrediction: number}}
 */
CV.leavePOut = function (Classifier, features, labels, classifierOptions, p) {
    check(features, labels);
    const distinct = getDistinct(labels);
    const confusionMatrix = initMatrix(distinct.length, distinct.length);
    var correct = 0, total = 0;
    var i, N = features.length;
    var gen = combinations(p, N);
    var allIdx = new Array(N);
    for (i = 0; i < N; i++) {
        allIdx[i] = i;
    }
    for (const testIdx of gen) {
        var trainIdx = allIdx.slice();
        
        for (i = testIdx.length - 1; i >= 0; i--) {
            trainIdx.splice(testIdx[i], 1);
        }

        var res = validate(Classifier, features, labels, classifierOptions, testIdx, trainIdx, confusionMatrix, distinct);
        total += res.total;
        correct += res.correct;
    }
    return {
        confusionMatrix,
        accuracy: correct / total,
        labels: distinct,
        nbPrediction: total
    };
};

/**
 * Performs k-fold cross-validation (KF-CV). KF-CV separates the data-set into k random equally sized partitions, and
 * uses each as a validation set, with all other partitions used in the training set. Observations left over from if k
 * does not divide the number of observations are left out of the cross-validation process.
 * @param Classifier - The classifier to use for the cross validation. Expect ml-classifier api.
 * @param {Array} features - The features for all samples of the data-set
 * @param {Array} labels - The classification class of all samples of the data-set
 * @param {Object} classifierOptions - The classifier options with which the classifier should be instantiated.
 * @param {Number} k - The number of partitions to create
 * @returns {{confusionMatrix, accuracy: number, labels, nbPrediction: number}}
 */
CV.kFold = function (Classifier, features, labels, classifierOptions, k) {
    check(features, labels);
    const distinct = getDistinct(labels);
    const confusionMatrix = initMatrix(distinct.length, distinct.length);
    var correct = 0, total = 0;
    var N = features.length;
    var allIdx = new Array(N);
    for (var i = 0; i < N; i++) {
        allIdx[i] = i;
    }

    var l = Math.floor(N / k);
    // create random k-folds
    var current = [];
    var folds = [];
    while (allIdx.length) {
        var randi = Math.floor(Math.random() * allIdx.length);
        current.push(allIdx[randi]);
        allIdx.splice(randi, 1);
        if (current.length === l) {
            folds.push(current);
            current = [];
        }
    }
    if (current.length) folds.push(current);
    folds = folds.slice(0, k);


    for (i = 0; i < folds.length; i++) {
        var testIdx = folds[i];
        var trainIdx = [];
        for (var j = 0; j < folds.length; j++) {
            if (j !== i) trainIdx = trainIdx.concat(folds[j]);
        }

        var res = validate(Classifier, features, labels, classifierOptions, testIdx, trainIdx, confusionMatrix, distinct);
        total += res.total;
        correct += res.correct;
    }

    return {
        confusionMatrix,
        accuracy: correct / total,
        labels: distinct,
        nbPrediction: total
    };

};

function check(features, labels) {
    if (features.length !== labels.length) {
        throw new Error('features and labels should have the same length');
    }
}

function initMatrix(rows, columns) {
    return new Array(rows).fill(0).map(() => new Array(columns).fill(0));
}

function getDistinct(arr) {
    var s = new Set();
    for (let i = 0; i < arr.length; i++) {
        s.add(arr[i]);
    }
    return Array.from(s);
}

function validate(Classifier, features, labels, classifierOptions, testIdx, trainIdx, confusionMatrix, distinct) {
    var correct = 0;
    var testFeatures = testIdx.map(function (index) {
        return features[index];
    });
    var trainFeatures = trainIdx.map(function (index) {
        return features[index];
    });
    var testLabels = testIdx.map(function (index) {
        return labels[index];
    });
    var trainLabels = trainIdx.map(function (index) {
        return labels[index];
    });

    var classifier = new Classifier(classifierOptions);
    classifier.train(trainFeatures, trainLabels);
    var predictedLabels = classifier.predict(testFeatures);
    for (var i = 0; i < predictedLabels.length; i++) {
        if (testLabels[i] === predictedLabels[i]) {
            correct++;
        }
        confusionMatrix[distinct.indexOf(testLabels[i])][distinct.indexOf(predictedLabels[i])]++;
    }

    return { total: testIdx.length, correct };
}

module.exports = CV;
