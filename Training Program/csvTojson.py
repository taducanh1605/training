import ntpath
import sys
import json
from csv import reader


filePath = sys.argv[-1]

if filePath!='':
    nameProg = ntpath.basename(filePath)[:-4]
    ex = []
    round = []
    timeRest = []
    with open(filePath, 'r', encoding='utf-8') as file:
        data = reader(file, delimiter=',')
        header = next(data)
        for row in data:
            if (row == header):
                continue
            ex.append(row[0])
            round.append(int(row[1]))
            timeRest.append(int(row[2]))
    
    output = {nameProg : [ex,round,timeRest]}
    outputName = "1.OutputJson/" + nameProg + ".json"
    #print(output)

    with open(outputName, 'w') as outfile:
        json.dump(output, outfile)