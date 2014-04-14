from pymongo import MongoClient, GEO2D
import csv, math, json, os

def spToDD(x, y):
    x = int(x)
    y = int(y)
    A = 20925646.32545932
    Ec = 0.08181919111988833
    Ec2 = Ec * Ec
    AngRad = math.pi/180
    pi4 = math.pi/4
    P1 = 34.333333333333343000 * AngRad
    P2 = 36.166666666666657000 * AngRad
    P0 = 33.750000000000000000 * AngRad
    M0 = -79 * AngRad
    X0 = 2000000.002616666
    m1 = math.cos(P1)/math.sqrt(1- (Ec2 * math.pow((math.sin(P1)),2)))
    m2 = math.cos(P2)/math.sqrt(1 - (Ec2 * math.pow((math.sin(P2)), 2)))
    t1 = math.tan(pi4 - (P1/2))/math.pow((1 - Ec * math.sin(P1))/ (1 + Ec * math.sin(P1)), (Ec/2))
    t2 =math.tan(pi4 - (P2/2))/math.pow((1 - Ec * math.sin(P2))/ (1 + Ec * math.sin(P2)), (Ec/2))
    t0 =math.tan(pi4 - (P0/2))/math.pow((1 - Ec * math.sin(P0))/ (1 + Ec * math.sin(P0)), (Ec/2))
    n = math.log(m1/m2)/math.log(t1/t2)
    F = m1/(n*math.pow(t1, n))
    rho0 = A * F * math.pow(t0, n)
    x = x - X0
    pi2 = math.pi/2
    rho = math.sqrt(math.pow(x,2) + (math.pow(rho0 - y, 2)))
    theta = math.atan(x/(rho0 - y))
    t = math.pow(rho / (A * F), (1 / n))
    LonR = theta / n + M0
    x = x + X0
    Lat0 = pi2 - (2 * math.atan(t))
    part1 = (1 - (Ec * math.sin(Lat0))) / (1 + (Ec * math.sin(Lat0)))
    LatR = pi2 - (2 * math.atan(t * math.pow(part1, (Ec/2))))
    while (abs(LatR - Lat0) > 0.000000002):
        Lat0 = LatR
        part1 = (1 - (Ec * math.sin(Lat0))) / (1 + (Ec * math.sin(Lat0)))
        LatR = pi2 - (2* math.atan(t * math.pow(part1, (Ec/2))))
    Lat = LatR/AngRad
    Lon = LonR/AngRad
    return [round(Lon,6), round(Lat,6)]

def pinToPoint (pin):
    x = '2'+pin[0]+pin[2]+pin[4]+pin[6]+pin[8]+'0'
    y = pin[1]+pin[3]+pin[5]+pin[7]+pin[9]+'0'
    return spToDD(x,y)
    
client = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
db = client.raleigh
collection = db.permits
file = "permits.csv"
with open(file, 'rb') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    cnt = 0
    header = []

    for row in reader:
        if cnt != 0:
            pin = row[0]
            if len(pin) == 10:
                lnglat = pinToPoint (pin)
                i = 0
                dict = {'type': 'Feature', 'properties':{}}
                for h in header:
                    field = h.lower()
                    val = row[i].strip()
                    if val.isdigit():
                        val = int(val)
                        #if 'date' in field:
                        #val = val.replace('-','')
                    dict['properties'][field] = val
                    i += 1
                dict['geometry'] = {"type": "Point", "coordinates": [float(lnglat[0]), float(lnglat[1])]}
                collection.insert(dict)
        else:
            header = row
        cnt += 1

