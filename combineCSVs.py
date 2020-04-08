import os
arr = os.listdir('./Mississippi')

csv = "";

for f in arr:
    days_file = open("./Mississippi/"+f,'r')
    c = days_file.read()
    csv = csv + c + "\n";
   
print(csv);

new_days = open("./mississippi.csv",'w')
new_days.write(csv)
new_days.close()