import ntpath
import sys
import json
import os
from csv import reader


filePath = sys.argv[-1]

if filePath!='':
    nameGer = filePath
    retval = os.getcwd()
    #print(retval)
    output = {}
    listLvl = os.listdir(nameGer)

    for lvl in listLvl:
        output[lvl] = [] 
        os.chdir(retval+"\\"+filePath+"\\"+lvl)
        listProg = os.listdir()
        for prog in listProg:
            nameProg = ntpath.basename(prog)[:-4]
            ex = []
            round = []
            timeRest = []
            with open(prog, 'r', encoding='utf-8') as file:
                data = reader(file, delimiter=',')
                header = next(data)
                for row in data:
                    if (row == header):
                        continue
                    ex.append(row[0])
                    round.append(int(row[1]))
                    timeRest.append(int(row[2]))
            output[nameProg] = [ex,round,timeRest]
        os.chdir(retval+"\\"+filePath)
    
    #print(output)
    outputName = "\\".join(os.getcwd().split("\\")[:-2]) + "\\" + nameGer + ".json"

    with open(outputName, 'w') as outfile:
        json.dump(output, outfile)