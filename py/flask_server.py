from flask import Flask
from flask_cors import CORS, cross_origin
from flask import jsonify
from flask import request

import json
import random
import site
import fi_astrosims.client
import numpy as np

site.addsitedir('/mnt/home/agabrielpillai/')
import illustris_python as il

host = '0.0.0.0'
port = '5000'

snapN = 0
subN = 0

basePath = '/mnt/home/agabrielpillai/Illustris-3/'
fields = ['SubhaloMass','SubhaloSFRinRad']
subhalos = il.groupcat.loadSubhalos(basePath,135,fields=fields)
GroupFirstSub = il.groupcat.loadHalos(basePath,135,fields=['GroupFirstSub'])


def samJSON(f, r, zl, zh):
    print('scsam')
    scsam = fi_astrosims.client.Simulation("scsam", host="http://astrosims.flatironinstitute.org")
    q = scsam.query(fields = ["redshift","ra","dec","r_disk","rbulge"],
                    field = f, realization = r,
                    redshift = (zl, zh))
    dat = q.numpy()

    position_data = {"pos-x": dat['ra'].tolist(),
                     "pos-y": dat['dec'].tolist(),
                     "pos-z": dat['redshift'].tolist()}

    size_data = {"r_bulge": dat['rbulge'].tolist(),
                 "r_disk": dat['r_disk'].tolist()}

    return {"positions": position_data, "size": size_data,
            "count": np.shape(dat['ra'])[0]}


def heatmapJSON(field, type):
    dat = il.snapshot.loadSubhalo(basePath, snapN, subN, type, fields=field)
    heatmap_data = {field: dat.tolist()}
    return(heatmap_data)


# 608, 1030
# Stellar magnitudes in eight bands: U, B, V, K, g, r, i, z
def partJSON(snapNum, subHaloNum):
    print('illustris')
    dat = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'stars',
                                  fields=None)
    dat_gas = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'gas', fields=None)

    stel_mags = dat['GFM_StellarPhotometrics']
    int_energy = dat_gas['InternalEnergy']

    B = stel_mags[:, 1]
    V = stel_mags[:, 2]

    T = 4600 * (1 / (0.92 * (B - V) + 1.7) + 1 / (0.92 * (B - V) + 0.62))
    T = (T - 1850) / 33000 * 100

    coords = dat['Coordinates']
    coords_gas = dat_gas['Coordinates']
    elec_abund = dat_gas['ElectronAbundance']

    x_CM = np.mean(coords[:, 0])
    y_CM = np.mean(coords[:, 1])
    z_CM = np.mean(coords[:, 2])

    # center our data around origin
    coords = coords - [x_CM, y_CM, z_CM]
    coords_gas = coords_gas - [x_CM, y_CM, z_CM]

    star_data = {"pos-x": coords[:, 0].tolist(),
                 "pos-y": coords[:, 2].tolist(),
                 "pos-z": coords[:, 1].tolist(),
                 "T": T.tolist(), "count": np.shape(coords)[0]}

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
    res = request.data
    data = res.decode('utf-8')
    data = json.loads(data)
    print(data)
    if data['simulation'] == 'scsam':
        field = int(float(data['field']))
        real = int(float(data['realization']))
        z_l = float(data['z_l'])
        z_h = float(data['z_h'])
        return jsonify(samJSON(field, real, z_l, z_h))

    global snapN
    snapN = int(float(data['snapshot']))

    global subN
    subN = int(float(data['subhalo']))

    return jsonify(partJSON(snapN, subN))


@app.route("/heatmap_JSON", methods=['GET', 'POST'])
def outputHeatmap():
    res = request.data
    data = res.decode('utf-8')
    data = json.loads(data)
    print(data)
    return jsonify(heatmapJSON(data['field'], data['type']))


@app.route('/')
def hello_world():
    return 'Hello, World!'


if __name__ == "__main__":
    app.run(host, port)
