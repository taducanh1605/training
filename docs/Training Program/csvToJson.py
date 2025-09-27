import ntpath
import sys
import json
import os
from csv import reader


filePath = sys.argv[-1]

if filePath != '':
    nameGer = filePath.split("\\")[-1]
    namePath = "\\".join(filePath.split("\\")[:-1])
    retval = os.getcwd()
    os.chdir(retval + "\\" + namePath)
    retval = os.getcwd()
    
    output = {}
    listLvl = os.listdir(nameGer)

    for lvl in listLvl:
        # Initialize dictionary for each level
        output[lvl] = {}
        
        level_path = retval + "\\" + nameGer + "\\" + lvl
        os.chdir(level_path)
        
        # Check if it's a folder
        if os.path.isdir(level_path):
            listProg = os.listdir()
            
            for prog in listProg:
                # Only process CSV files
                if prog.endswith('.csv'):
                    nameProg = ntpath.basename(prog)[:-4]
                    ex = []
                    round = []
                    timeRest = []
                    
                    try:
                        with open(prog, 'r', encoding='utf-8') as file:
                            data = reader(file, delimiter=',')
                            header = next(data)
                            
                            for row in data:
                                if row == header or len(row) < 3:
                                    continue
                                    
                                # Check if row is not empty
                                if row[0].strip():
                                    ex.append(row[0].strip())
                                    
                                    # Handle round with error handling
                                    try:
                                        round.append(int(row[1]))
                                    except (ValueError, IndexError):
                                        round.append(1)
                                    
                                    # Handle timeRest with error handling
                                    try:
                                        timeRest.append(int(row[2]))
                                    except (ValueError, IndexError):
                                        timeRest.append(30)
                        
                        # Only add to output if there are exercises
                        if ex:
                            output[lvl][nameProg] = [ex, round, timeRest]
                            
                    except Exception as e:
                        continue
        
        os.chdir(retval + "\\" + nameGer)
    
    # Create output file name
    outputName = "\\".join(os.getcwd().split("\\")[:-2]) + "\\" + nameGer + ".json"

    # Write JSON file in one line to save space (for DB)
    with open(outputName, 'w', encoding='utf-8') as outfile:
        json.dump(output, outfile, ensure_ascii=False, separators=(',', ':'))
