import os

"""
arr = os.listdir('./California')
csv = "";
for f in arr:
    days_file = open("./California/"+f,'r')
    c = days_file.read()
    csv = csv + c + "\n";
#print(csv);
new_days = open("./california.csv",'w')
new_days.write(csv)
new_days.close()
"""

arr = os.listdir('./old')
csv = "";
for f in arr:
    days_file = open("./old/"+f,'r')
    c = days_file.read()
    csv = csv + c + "\n";
#print(csv);
new_days = open("./old.csv",'w')
new_days.write(csv)
new_days.close()

arr = os.listdir('./new')
csv = "";
for f in arr:
    days_file = open("./new/"+f,'r')
    c = days_file.read()
    csv = csv + c + "\n";
#print(csv);
new_days = open("./new.csv",'w')
new_days.write(csv)
new_days.close()