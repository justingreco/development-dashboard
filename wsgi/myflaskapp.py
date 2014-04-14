from flask import Flask
from flask import request
from flask import render_template
from pymongo import MongoClient
from bson.json_util import dumps
from datetime import datetime
import os
app = Flask(__name__)

@app.route("/ws/addresses/like")
def addressesLike():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        text = request.args.get('input')
        limit = request.args.get('limit')
        result = db.addresses.find({"properties.ADDRESS": {"$regex": "^"+text, "$options":"i"}}).sort("properties.ADDRESS", 1).limit(int(limit))
        return dumps(result)

@app.route("/ws/devplans")
def devplans():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        start = 20140110
        end = 20140210
        result = db.devplans.find({"properties.submitted": {"$gte": start, "$lte": end}}).limit(1000)

        return dumps(result)

@app.route("/ws/devplans/near")
def devplansNear():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        dist = float(request.args.get('dist'))
        fields = {"geometry": 1, "type": 1, "properties.plan_number": 1, "properties.plan_name": 1, "properties.plan_type": 1, "properties.submitted": 1, "properties.owner": 1, "properties.engineer": 1, "properties.acreage": 1}
        result = None
        if request.args.get('from') is not None and request.args.get('to') is not None:
                fromdate = int(request.args.get('from'))
                todate = int(request.args.get('to'))
                result = db.devplans.find({"geometry":{"$near": {"$geometry":{"type":"Point", "coordinates": [lon, lat]}, "$maxDistance": dist}}, "properties.submitted":{"$gte": fromdate, "$lte": todate}}, fields).limit(1000).sort("properties.submitted", -1)
        else:
                result = db.devplans.find({"geometry":{"$near": {"$geometry":{"type":"Point", "coordinates": [lon, lat]}, "$maxDistance": dist}}}, fields).limit(1000).sort("properties.submitted", -1)
        return dumps(result)
@app.route("/ws/devplans/group/type")
def devplansGroupType():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        dist = float(request.args.get('dist'))
        field = float(request.args.get('field'))
        result = None
        fromdate = int(request.args.get('from'))
        todate = int(request.args.get('to'))
        result = db.devplans.aggregate([{"$geoNear":{"near":[lon, lat], "maxDistance": dist/3959, "distanceMultiplier":3959, "distanceField":"distance", "spherical": "true", "limit": 1000, "query":{"properties.submitted":{"$gte": fromdate, "$lte": todate}}}},{"$group": {"_id":"$properties."+field, "total":{"$sum":1}}}])
        return dumps(result)

@app.route("/ws/permits")
def permits():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        start = 20140110
        end = 20140210
        result = db.permits.find().limit(1000)
        #result = db.permits.find({"properties.issue_date": {"$gte": start, "$lte": end}}).limit(1000)

        return dumps(result)

@app.route("/ws/permits/near")
def permitsNear():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        dist = float(request.args.get('dist'))
        fields = {"geometry": 1, "type": 1, "properties.permit_num": 1, "properties.proposed_work": 1, "properties.authorized_work": 1, "properties.permitted_work_type": 1, "properties.development_plan": 1, "properties.address": 1, "properties.issue_date": 1, "properties.completion_date": 1, "properties.owner": 1, "properties.contractor": 1, "properties.cost": 1}
        result = None
        if request.args.get('from') is not None and request.args.get('to') is not None:
                fromdate = int(request.args.get('from'))
                todate = int(request.args.get('to'))
                result = db.permits.find({"geometry":{"$near": {"$geometry":{"type":"Point", "coordinates": [lon, lat]}, "$maxDistance": dist}}, "properties.issue_date":{"$gte": fromdate, "$lte": todate}}, fields).limit(1000).sort("properties.issue_date", -1)
        else:
                result = db.permits.find({"geometry":{"$near": {"$geometry":{"type":"Point", "coordinates": [lon, lat]}, "$maxDistance": dist}}}, fields).limit(1000).sort("properties.issue_date", -1)
        return dumps(result)

@app.route("/ws/permits/group/type")
def permitsGroupType():
        c = MongoClient(os.getenv("OPENSHIFT_MONGODB_DB_URL"))
        db = c.raleigh
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        dist = float(request.args.get('dist'))
        field = float(request.args.get('field'))
        result = None
        if request.args.get('from') is not None and request.args.get('to') is not None:
                fromdate = int(request.args.get('from'))
                todate = int(request.args.get('to'))
                result = db.permits.aggregate([{"$geoNear":{"near":[lon, lat], "maxDistance": dist/3959, "distanceMultiplier":3959, "distanceField":"distance", "spherical": "true", "limit": 1000, "query":{"properties.issue_date":{"$gte": fromdate, "$lte": todate}}}},{"$group": {"_id":"$properties."+field, "total":{"$sum":1}}}])
        return dumps(result)
@app.route("/dashboard/")
def dashboard():
        return render_template("dashboard/index.html")

if __name__ == "__main__":
        app.run()