import tkinter as tk

import site
import numpy as np

import seaborn as sns

import matplotlib as mpl
import matplotlib.backends.tkagg as tkagg
from matplotlib.backends.backend_agg import FigureCanvasAgg
from mpl_toolkits.mplot3d import Axes3D

import illustris_python as il


class Gui:

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Notpad")
        self.root.title("Subhalo Particle Visualizer")
        self.canvas = tk.Canvas(self.root, width=1300, height=700, background="white")


def update_plot(h):
    mpl.pyplot.close('all')

    fig = mpl.pyplot.figure(figsize=(10, 7))
    gs = mpl.gridspec.GridSpec(3, 4)

    ax1 = mpl.pyplot.subplot(gs[0])
    sns.heatmap(data=np.log(h[0]), ax=ax1)

    ax2 = mpl.pyplot.subplot(gs[4])
    sns.heatmap(data=np.log(h[1]), ax=ax2)

    ax3 = mpl.pyplot.subplot(gs[8])
    sns.heatmap(data=np.log(h[2]), ax=ax3)

    ax4 = mpl.pyplot.subplot2grid((3, 3), (0, 1), colspan=3,
                                  rowspan=3, projection='3d')
    ax4.set_title('3D Scatter')
    ax4.scatter(xs=coords[:, 0], ys=coords[:, 1], zs=coords[:, 2], s=2)
    ax4.view_init(elev=0, azim=270)
    ax4.set_xlabel('Pos_x')
    ax4.set_ylabel('Pos_y')
    ax4.set_zlabel('Pos_z')
    ax4.dist = 6.5
    #fig.subplots_adjust(left=0, right=1, bottom=0, top=1)

    return fig


def update_h(coords, w=None):
    if w is None:
        w = np.ones(len(coords))
    range_arr = [[coords[:, 0].min(), coords[:, 0].max()],
                 [coords[:, 2].min(), coords[:, 2].max()]]
    H, xedges, yedges = np.histogram2d(x=coords[:, 0], y=coords[:, 2],
                                       bins=[25, 25], range=range_arr,
                                       weights=w)
    return H


def rotate_coords_z(coordinates, beta):
    theta = 0
    c, s = np.cos(theta), np.sin(theta)
    rot_mat_z = np.array(((c, -s, 0), (s, c, 0), (0, 0, 1)))
    return (coordinates @ rot_mat_z)

""""https://matplotlib.org/gallery/user_interfaces/embedding_in_tk_canvas_sgskip.html"""
def draw_figure(canvas, figure, loc=(0, 0)):
    """ Draw a matplotlib figure onto a Tk canvas

    loc: location of top-left corner of figure on canvas in pixels.
    Inspired by matplotlib source: lib/matplotlib/backends/backend_tkagg.py
    """
    figure_canvas_agg = FigureCanvasAgg(figure)
    figure_canvas_agg.draw()
    figure_x, figure_y, figure_w, figure_h = figure.bbox.bounds
    figure_w, figure_h = int(figure_w), int(figure_h)
    photo = tk.PhotoImage(master=canvas, width=figure_w, height=figure_h)

    # Position: convert from top-left anchor to center anchor
    canvas.create_image(loc[0] + figure_w / 2, loc[1] + figure_h / 2,
                        image=photo)

    # Unfortunately, there's no accessor for the pointer to the native renderer
    tkagg.blit(photo, figure_canvas_agg.get_renderer()._renderer, colormode=2)

    # Return a handle which contains a reference to the photo object
    # which must be kept live or else the picture disappears
    return photo


def update_all(coords, theta):
    new_coords = rotate_coords_z(coords, theta)

    H_n = update_h(new_coords)
    H_metals = update_h(new_coords, metals)
    H_mass = update_h(new_coords, masses)
    return new_coords, [H_n, H_metals, H_mass]

site.addsitedir('/mnt/c/Users/austr/OneDrive/Documents/GitHub/Subhalo Particle Visualizer/py/illustris_python')
basePath = './Illustris-3/'
fields = ['SubhaloMass','SubhaloSFRinRad']
subhalos = il.groupcat.loadSubhalos(basePath,135,fields=fields)

dat = il.snapshot.loadSubhalo(basePath, 135, 608, 'stars', fields=None)
GroupFirstSub = il.groupcat.loadHalos(basePath,135,fields=['GroupFirstSub'])

# obtain quantities we will need for histograms and such
# stel_mags = dat['GFM_StellarPhotometrics']
masses = dat['Masses']
metals = dat['GFM_Metallicity']
coords = dat['Coordinates']

# average position of stars
x = (np.max(coords[:, 0]) + np.min(coords[:, 0])) / 2
y = (np.max(coords[:, 1]) + np.min(coords[:, 1])) / 2
z = (np.max(coords[:, 2]) + np.min(coords[:, 2])) / 2

# center our data around origin
coords = coords - [x, y, z]

# get hist2d data to make heatmaps
H_n = update_h(coords)
H_metals = update_h(coords, metals)
H_mass = update_h(coords, masses)

# set 0s as 1s for ln()
H_n[H_n < 1] = 1
H_metals[H_metals < 0.01] = 1
H_mass[H_mass < 0.01] = 1

# Create the figure we desire to add to an existing canvas
fig_plots = update_plot([H_n, H_metals, H_mass])

gui = Gui()

lab_1 = tk.Label(gui.root, text="Snapshot #:")
lab_2 = tk.Label(gui.root, text="Subhalo id:")

e_1 = tk.Entry(gui.root, text="135")
e_2 = tk.Entry(gui.root, text="608")

b_1 = tk.Button(gui.root, text="submit")
b_2 = tk.Button(gui.root, text="submit")

# Keep this handle alive, or else figure will disappear
fig_x, fig_y = 10, 10
fig_photo = draw_figure(gui.canvas, fig_plots, loc=(fig_x, fig_y))
fig_w, fig_h = fig_photo.width(), fig_photo.height()


lab_1.grid(row=1, column=37)
e_1.grid(row=1,column=38)
b_1.grid(row=1, column=39)
lab_2.grid(row=1, column=40)
e_2.grid(row=1,column=41)
b_2.grid(row=1, column=42)

# Let Tk take over
gui.canvas.grid(row=0, column =0, columnspan=100, rowspan=15)

var_x = tk.DoubleVar()
label_x = tk.Label(gui.root, text="rotate x", bg='white')
scale_x = tk.Scale(gui.root, variable=var_x, to=360, length=360, bg='white')
b_x = tk.Button(gui.root, text="rotate")
label_x.grid(row=6, column=72)
scale_x.grid(row=7, column=72)
b_x.grid(row=8, column=72)

var_y = tk.DoubleVar()
label_y = tk.Label(gui.root, text="rotate y", bg='white')
scale_y = tk.Scale(gui.root, variable=var_y, to=360, length=360, bg='white')
b_y = tk.Button(gui.root, text="rotate")
label_y.grid(row=6, column=82)
scale_y.grid(row=7, column=82)
b_y.grid(row=8, column=82)

var_z = tk.DoubleVar()
label_z = tk.Label(gui.root, text="rotate z", bg='white')
scale_z = tk.Scale(gui.root, variable=var_z, to=360, length=360, bg='white')
b_z = tk.Button(gui.root, text="rotate")
label_z.grid(row=6, column=92)
scale_z.grid(row=7, column=92)
b_z.grid(row=8, column=92)

#button = tk.Button(gui.root, text = "Get Scale Value", command = update_all)
#button.pack()

gui.root.mainloop()
