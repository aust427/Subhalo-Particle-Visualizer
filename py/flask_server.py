from flask import Flask
from flask_cors import CORS, cross_origin
from flask import jsonify
from flask import request

import json
import random
import site
import numpy as np

import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

site.addsitedir('/mnt/c/Users/austr/Downloads/')
import illustris_python as il

basePath = '/mnt/c/Users/austr/Downloads//Illustris-3/'
fields = ['SubhaloMass','SubhaloSFRinRad']
subhalos = il.groupcat.loadSubhalos(basePath,135,fields=fields)
GroupFirstSub = il.groupcat.loadHalos(basePath,135,fields=['GroupFirstSub'])

# 608, 1030
# Stellar magnitudes in eight bands: U, B, V, K, g, r, i, z
def partJSON(snapNum, subHaloNum):
    dat = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'stars',
                                  fields=None)
    dat_gas = il.snapshot.loadSubhalo(basePath, snapNum, subHaloNum, 'gas', fields=None)

    stel_mags = dat['GFM_StellarPhotometrics']

    B = stel_mags[:, 1]
    V = stel_mags[:, 2]

    T = 4600 * (1 / (0.92 * (B - V) + 1.7) + 1 / (0.92 * (B - V) + 0.62))
    T = (T - 1850) / 33000 * 100

    metals = dat['GFM_Metallicity']

    coords = dat['Coordinates']
    coords_gas = dat_gas['Coordinates']

    x_CM = np.mean(coords[:, 0])
    y_CM = np.mean(coords[:, 1])
    z_CM = np.mean(coords[:, 2])

    # center our data around orgin
    coords = coords - [x_CM, y_CM, z_CM]
    coords_gas = coords_gas - [x_CM, y_CM, z_CM]

    star_data = {"pos-x": coords[:, 0].tolist(),
                 "pos-y": coords[:, 2].tolist(),
                 "pos-z": coords[:, 1].tolist(),
                 "T": T.tolist(), "count": np.shape(coords)[0]}

    gas_data = {"pos-x": coords_gas[:, 0].tolist(),
                "pos-y": coords_gas[:, 2].tolist(),
                "pos-z": coords_gas[:, 1].tolist(),
                "count": np.shape(coords_gas)[0]}

    return({"stars": star_data, "gas": gas_data})

app = Flask(__name__)
cors = CORS(app)

app.config['CORS_HEADERS'] = 'Content-Type'

@app.route("/particle_JSON", methods=['GET', 'POST'])
@cross_origin()
def output():
    res = request.data
    data = res.decode('utf-8')
    data = json.loads(data)
    return jsonify(partJSON(int(float(data['snapshot'])), int(float(data['subhalo']))))

if __name__ == "__main__":
	app.run()