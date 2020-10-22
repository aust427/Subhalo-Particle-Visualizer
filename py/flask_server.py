from flask import Flask
from flask_cors import CORS, cross_origin
from flask import jsonify
from flask import request

import json
import random
import site
import numpy as np

site.addsitedir('/mnt/home/agabrielpillai/')
import illustris_python as il

basePath = '/mnt/home/agabrielpillai/Illustris-3/'
host = '0.0.0.0'
port = '5000'

snapN = 0
subN = 0


def heatmapJSON(field, type, subfield):
    dat = il.snapshot.loadSubhalo(basePath, snapN, subN, type, fields=field)
    if subfield:
        dat = dat[:, int(subfield)]
    heatmap_data = {field: dat.tolist()}
    return(heatmap_data)


def partJSON(snapNum, subHaloNum):
    dat_stars = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'stars',
                                  fields=['Coordinates', 'ParticleIDs'])
    dat_gas = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'gas',
                                      fields=['InternalEnergy', 'Coordinates', 'ElectronAbundance'])

    int_energy = dat_gas['InternalEnergy']
    coords_stars = dat_stars['Coordinates']
    coords_gas = dat_gas['Coordinates']
    elec_abund = dat_gas['ElectronAbundance']

    x_CM = np.mean(coords_stars[:, 0])
    y_CM = np.mean(coords_stars[:, 1])
    z_CM = np.mean(coords_stars[:, 2])

    # center our data around origin
    coords_stars = coords_stars - [x_CM, y_CM, z_CM]
    coords_gas = coords_gas - [x_CM, y_CM, z_CM]

    star_data = {"pos-x": coords_stars[:, 0].tolist(),
                 "pos-y": coords_stars[:, 2].tolist(),
                 "pos-z": coords_stars[:, 1].tolist(),
                 "count": np.shape(coords_stars)[0]}

    gas_data = {"pos-x": coords_gas[:, 0].tolist(),
                "pos-y": coords_gas[:, 2].tolist(),
                "pos-z": coords_gas[:, 1].tolist(),
                "int-eng": int_energy.tolist(),
                "nelec": elec_abund.tolist(),
                "count": np.shape(coords_gas)[0]}

    return {"stars": star_data, "gas": gas_data}

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/particle_JSON", methods=['GET', 'POST'])
@cross_origin()
def output():
    data = json.loads(request.data.decode('utf-8'))

    global snapN
    snapN = int(float(data['snapshot']))

    global subN
    subN = int(float(data['subhalo']))

    return jsonify(partJSON(snapN, subN))


@app.route("/heatmap_JSON", methods=['GET', 'POST'])
def outputHeatmap():
    data = json.loads(request.data.decode('utf-8'))

    return jsonify(heatmapJSON(data['field'], data['type'], data['subfield']))


@app.route('/')
def hello_world():
    return 'Hello, World!'


if __name__ == "__main__":
    app.run(host, port)
